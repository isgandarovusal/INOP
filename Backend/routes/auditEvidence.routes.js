const router=require('express').Router();
const {authorize}=require('../middleware/authorization.middleware');
const {requireAuditParentAccess,requireAuditAccess,getAuditScopeFilter}=require('../middleware/auditScope.middleware');
const {privateUpload,types}=require('../middleware/privateUpload.middleware');
const Evidence=require('../models/auditEvidence.model');
const storage=require('../services/auditEvidenceStorage.service');
async function freshAccess(req,res,action){
 await require('../middleware/auth.middleware').verifyToken(req,res,()=>{});if(res.headersSent)return false;
 const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,'audit',action);req.permission={scope};
 delete req.auditorProfile;await require('../middleware/auditDirection.middleware').requireAuditDirection(req,res,()=>{});if(res.headersSent)return false;
 const filter=await getAuditScopeFilter(req);if(!filter||!await require('../models/audit.model').exists({$and:[{_id:req.auditScopeId},filter]})){res.status(403).json({message:'Evidence access changed.'});return false;}return true;
}
router.post('/:auditId',...authorize('audit','update'),requireAuditParentAccess,(req,res,next)=>{
 try{req.evidenceStore=storage.fromEnvironment();next();}catch{res.status(503).json({message:'Durable private Audit evidence storage is not configured.'});}
},privateUpload('file',Object.keys(types),false),async(req,res)=>{
 if(!req.file)return res.status(400).json({message:'File is required.'});
 let ref,dbAttempted=false;
 try{
  const hello=await require('mongoose').connection.db.admin().command({hello:1});if(!hello.setName&&hello.msg!=='isdbgrid')throw Object.assign(Error('Audit writes require MongoDB transactions.'),{status:503});
  if(await require('../models/auditClosure.model').exists({auditId:req.auditScopeId}))throw Object.assign(Error('Closed audit is immutable.'),{status:409});
  const input=storage.prepare(req.file.buffer,req.file.mimetype,String(req.auditScopeId),req.evidenceStore.provider,req.file.originalname);
  ref=await req.evidenceStore.put(input,req.file.buffer);
  if(!await freshAccess(req,res,'update')){await req.evidenceStore.remove(ref);return;}
  dbAttempted=true;
  const data=await require('../services/auditTransaction.service').transaction(async session=>{
   const audit=await require('../services/auditLifecycle.service').lockAudit(req.auditScopeId,session,req.user);
   if(await require('../models/auditClosure.model').exists({auditId:audit._id}).session(session))throw Object.assign(Error('Closed audit is immutable.'),{status:409});
   const [evidence]=await Evidence.create([{auditId:audit._id,storageKey:ref.key,storageReference:ref,name:req.file.originalname,size:ref.size,mimeType:ref.mimeType,uploadedBy:req.user.id}],{session});
   audit.attachments.push({name:evidence.name,size:evidence.size,blobUrl:`/api/audit-evidence/${evidence._id}/file`});await audit.save({session});
   await require('../services/auditLifecycle.service').recordHistory(audit,req.user,'evidence-uploaded',session);return evidence;
  });res.status(201).json({success:true,data:{id:data._id,name:data.name,size:data.size,url:`/api/audit-evidence/${data._id}/file`}});
 }catch(error){
  // Never erase an original after an uncertain DB commit. Reconcile retained orphans only by approved dry-run.
  if(ref&&!dbAttempted)try{await req.evidenceStore.remove(ref);}catch{/* Retain an uncertain original; no provider secrets are logged. */}
  if(!res.headersSent)res.status(error.status||500).json({message:error.code?.startsWith('AUDIT_STORAGE_')?'Private audit storage is unavailable.':error.status?error.message:'Evidence upload failed.'});
 }
});
router.get('/by-audit/:auditId',...authorize('audit','read'),requireAuditParentAccess,async(req,res)=>{
 const rows=await Evidence.find({auditId:req.auditScopeId}).select('_id name size').sort({createdAt:-1}).lean();res.json({success:true,data:rows.map(row=>({id:String(row._id),name:row.name,size:row.size}))});
});
router.get('/:id/file',...authorize('audit','read'),async(req,res,next)=>{
 if(!require('mongoose').isObjectIdOrHexString(req.params.id))return res.status(404).json({message:'Evidence not found.'});const row=await Evidence.findById(req.params.id).lean();if(!row)return res.status(404).json({message:'Evidence not found.'});req.evidence=row;req.auditScopeId=String(row.auditId);next();
},requireAuditAccess,async(req,res)=>{
 try{
  const ref=req.evidence.storageReference;
  const bytes=ref?await storage.forReference(ref,req.auditScopeId).get(ref):await require('../controllers/privateFiles.controller').readBoundedPrivateFile(req.evidence.storageKey);
  if(!bytes)return res.status(404).json({message:'Evidence not found.'});if(!await freshAccess(req,res,'read'))return;
  res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"});res.set('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(req.evidence.name));res.type(req.evidence.mimeType).send(bytes);
 }catch(error){if(!res.headersSent)res.status(error.code==='AUDIT_STORAGE_IDENTITY_MISMATCH'?409:error.code?.startsWith('AUDIT_STORAGE_')&&error.status!==404?503:404).json({message:'Private evidence is unavailable.'});}
});
module.exports=router;
