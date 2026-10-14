const router = require('express').Router();
const { authorize } = require('../middleware/authorization.middleware');
const { requireAuditParentAccess, requireAuditAccess } = require('../middleware/auditScope.middleware');
const { privateUpload, types } = require('../middleware/privateUpload.middleware');
const Evidence = require('../models/auditEvidence.model');
router.post('/:auditId', ...authorize('audit','update'), requireAuditParentAccess, (req,res,next)=> {
  if (process.env.RENDER === 'true') return res.status(503).json({message:'Durable private Audit evidence storage must be configured before production uploads.'});
  next();
}, privateUpload('file',Object.keys(types)), async(req,res)=> {
  if (!req.file) return res.status(400).json({message:'File is required.'});
  try {
    const data=await require('../services/auditTransaction.service').transaction(async session=> {
      const audit=await require('../services/auditLifecycle.service').lockAudit(req.auditScopeId,session,req.user);
      if (await require('../models/auditClosure.model').exists({auditId:audit._id}).session(session)) throw Object.assign(new Error('Closed audit is immutable.'),{status:409});
      const [evidence]=await Evidence.create([{auditId:audit._id,storageKey:req.file.filename,name:req.file.originalname,size:req.file.size,mimeType:req.file.mimetype,uploadedBy:req.user.id}],{session});
      audit.attachments.push({ name: evidence.name, size: evidence.size, blobUrl: `/api/audit-evidence/${evidence._id}/file` });
      await audit.save({session});
      await require('../models/auditActivity.model').create([{auditId:audit._id,userId:req.user.id,action:'evidence-uploaded',resource:'evidence'}],{session});
      return evidence;
    });
    res.status(201).json({success:true,data:{id:data._id,name:data.name,size:data.size,url:`/api/audit-evidence/${data._id}/file`}});
  }catch(error){res.status(error.status||500).json({message:error.status?error.message:'Evidence upload failed.'});}
});
router.get('/by-audit/:auditId', ...authorize('audit','read'), requireAuditParentAccess, async(req,res)=>{
  const rows=await Evidence.find({auditId:req.auditScopeId}).select('_id name size').sort({createdAt:-1}).lean();
  res.json({success:true,data:rows.map(row=>({id:String(row._id),name:row.name,size:row.size}))});
});
router.get('/:id/file', ...authorize('audit','read'), async(req,res,next)=> {
  if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) return res.status(404).json({message:'Evidence not found.'});
  const evidence=await Evidence.findById(req.params.id).lean();
  if (!evidence) return res.status(404).json({message:'Evidence not found.'});
  req.evidence=evidence;req.auditScopeId=String(evidence.auditId);next();
},requireAuditAccess,async(req,res)=> {
  try {
    const bytes=await require('../controllers/privateFiles.controller').readBoundedPrivateFile(req.evidence.storageKey);
    if (!bytes) return res.status(404).json({message:'Evidence not found.'});
    res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');res.set('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(req.evidence.name));
    res.type(req.evidence.mimeType).send(bytes);
  }catch{res.status(404).json({message:'Evidence not found.'});}
});
module.exports=router;
