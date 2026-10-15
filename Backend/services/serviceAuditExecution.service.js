const Execution=require('../models/auditExecution.model');
const {transaction,auditError}=require('./auditTransaction.service');
const {lockAudit,recordHistory}=require('./auditLifecycle.service');
const hr=require('./serviceAuditAssessment.service');
async function save(req,complete=false){
 return transaction(async session=>{
  const audit=await lockAudit(req.auditScopeId,session,req.user);
  const currentUser=await require('../models/user.model').findById(req.user.id).session(session).lean();
  if(!currentUser?.isActive)throw auditError(403,'Service writer is no longer active.');
  const scope=await require('../middleware/auth.middleware').getPermissionScope(currentUser.role,'audit.execution','update');
  const profile=await require('../models/auditorProfile.model').findById(req.user.id).session(session).lean();
  const access=await require('../middleware/auditScope.middleware').getAuditScopeFilter({user:{id:req.user.id,role:currentUser.role,departmentId:currentUser.departmentId},permission:{scope},auditorProfile:profile||undefined});
  if(!access||!await require('../models/audit.model').exists({$and:[{_id:audit._id},access]}).session(session))throw auditError(403,'Service write access changed.');
  if(audit.auditType!=='service'||await require('../models/auditClosure.model').exists({auditId:audit._id}).session(session))throw auditError(409,'Service audit is not writable.');
  const row=await Execution.findOne({_id:req.executionId,auditId:audit._id}).session(session);
  if(!row||!row.templateSnapshot?.serviceSource)throw auditError(409,'A reviewed Service source revision is required.');
  if(!['draft','in-progress'].includes(row.status)||['completed','cancelled','archived'].includes(audit.status))throw auditError(409,'Completed Service answers are immutable.');
  if(!Number.isInteger(req.body.expectedVersion)||req.body.expectedVersion!==(row.serviceVersion||0))throw auditError(409,'Service draft changed. Reload before saving.');
  const context=await require('../models/auditContext.model').findById(audit._id).session(session);
  if(!row.templateRevisionId||String(context?.templateRevisionId)!==String(row.templateRevisionId)||String(audit.templateRevisionId)!==String(row.templateRevisionId))throw auditError(409,'Service revision linkage is invalid.');
  const assessment=hr.assessService(row.templateSnapshot,req.body.answers,complete);
  const details=hr.normalizeDetails(row.templateSnapshot,req.body.details);
  const finalIds=[details.finalEvidence.photoId,...details.finalEvidence.documentIds,...Object.values(details.sectionPhotos)].filter(Boolean);
  if(new Set([details.finalEvidence.photoId,...details.finalEvidence.documentIds].filter(Boolean)).size!==[details.finalEvidence.photoId,...details.finalEvidence.documentIds].filter(Boolean).length)throw auditError(400,'Duplicate Service final attachment.');
  for(const id of finalIds){
   if(!require('mongoose').isObjectIdOrHexString(id))throw auditError(400,'Invalid Service final evidence.');
   const file=await require('../models/auditEvidence.model').findOne({_id:id,auditId:audit._id}).session(session).lean();
   if(!file||(id===details.finalEvidence.photoId||Object.values(details.sectionPhotos).includes(id))&&(typeof file.mimeType!=='string'||!file.mimeType.startsWith('image/')))throw auditError(400,'Final evidence must belong to this Service audit; a photo must be an image.');
  }
  const answers=req.body.answers.map(a=>({questionId:a.questionId,answer:a.answer,comment:hr.text(a.comment),score:['0','0.5','1'].includes(a.answer)?Number(a.answer):null}));
  const evidence=req.body.evidenceLinks||[];
  const questionIds=new Set(row.templateSnapshot.sections.flatMap(s=>s.questions.map(q=>q.id)));
  if(!Array.isArray(evidence)||evidence.length>200)throw auditError(400,'Invalid Service evidence links.');
  for(const link of evidence){
   if(!link||!questionIds.has(link.questionId)||!require('mongoose').isObjectIdOrHexString(link.evidenceId)||!await require('../models/auditEvidence.model').exists({_id:link.evidenceId,auditId:audit._id}).session(session))throw auditError(400,'Evidence must belong to this Service audit.');
  }
  row.answers=answers;row.serviceDetails={...details,evidenceLinks:evidence.map(({questionId,evidenceId})=>({questionId,evidenceId}))};row.serviceVersion=(row.serviceVersion||0)+1;
  row.status=complete?'completed':'in-progress';Object.assign(row,assessment);row.totalScore=null;row.riskLevel='unscored';await row.save({session});
  audit.checks=answers;audit.serviceDetails=row.serviceDetails;Object.assign(audit,assessment);audit.status='in-progress';await audit.save({session});
  await recordHistory(audit,req.user,`service-${complete?'submitted':'draft-saved'}-v${row.serviceVersion}`,session);
  await require('../models/serviceAuditSave.model').create([{_id:`${row._id}:${row.serviceVersion}`,auditId:audit._id,executionId:row._id,version:row.serviceVersion,actor:req.user.id,at:new Date(),status:row.status,answers,details:row.serviceDetails,assessment}],{session});
  return row;
 });
}
module.exports={save};
module.exports.requireSubmitted=async(audit,session)=>{
 const row=await Execution.findOne({auditId:audit._id,templateRevisionId:audit.templateRevisionId,status:'completed'}).session(session);
 if(!row?.templateSnapshot?.serviceSource||!row.serviceAssessment?.complete)throw auditError(409,'Submit the Service form before approval closure or completion.');
 return row;
};
