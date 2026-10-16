// Explicit processing only; never derives audit questions, weights or templates.
const Source=require('../models/auditSourceDocument.model');
const {randomUUID}=require('node:crypto');
exports.process=async(req,res)=>{
 let document,token;
 try{
  const query={...require('../controllers/privateFiles.controller').sourceQuery(req.params.id),...(req.auditCatalogFilter||{}),archivedAt:null};
  document=await Source.findOne(query).lean();if(!document)return res.status(404).json({message:'Source not found.'});
  if(!['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(document.mimeType))return res.status(415).json({message:'Only PDF/DOCX extraction is supported.'});
  token=randomUUID();const claimed=await Source.findOneAndUpdate({...query,status:{$in:['uploaded','failed']}},{$set:{status:'processing',processingToken:token,processingStartedAt:new Date()}},{returnDocument:'after'});
  if(!claimed)return res.status(409).json({message:'Source is already processing or processed.'});
  const bytes=await require('../controllers/privateFiles.controller').readBoundedPrivateFile(document.fileName);
  if(!bytes||bytes.length!==document.size)throw Error('Source unavailable.');
  const result=await require('../services/documentWorkerPool.service').pool.run('extract',bytes,document.originalName);
  // Re-authorize against current JWT/DB role and profile after asynchronous parsing.
  await require('../middleware/auth.middleware').verifyToken(req,res,()=>{});if(res.headersSent)return;
  const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,'audit.source_document','create');
  const profile=await require('../models/auditorProfile.model').findById(req.user.id).lean();
  if(scope!=='all'||(req.user.role==='auditor'&&!profile)||(profile&&(!profile.active||!require('../services/auditDirection.service').hasDirection(profile,document.auditType)||profile.organizationId!==document.organizationId)))throw Object.assign(Error('Source permission changed.'),{status:403});
  const updated=await Source.findOneAndUpdate({_id:document._id,archivedAt:null,status:'processing',processingToken:token},{$set:{status:'processed',extractedData:{text:result.text,warnings:result.warnings||[],method:result.method||'bounded-extraction'},processedAt:new Date()},$unset:{processingToken:1}},{returnDocument:'after'}).lean();
  if(!updated)return res.status(409).json({message:'Source changed during extraction.'});
  await require('../services/activityLog.service').recordActivity({req,action:'update',entityType:'audit_source_document',entityId:document._id,description:'Audit source text extracted'});
  return res.json({success:true,data:{id:updated.id,status:updated.status,extractedData:updated.extractedData}});
 }catch(error){if(document&&token)await Source.updateOne({_id:document._id,processingToken:token},{$set:{status:'failed'},$unset:{processingToken:1}});if(res.headersSent)return;res.status(error.status||503).json({message:error.status?'Source permission changed.':'Source extraction unavailable.'});}
};
