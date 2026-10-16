const Execution=require('../models/auditExecution.model');
const {transaction,auditError}=require('./auditTransaction.service');
const {lockAudit,recordHistory}=require('./auditLifecycle.service');
const standard=require('./standardAuditAssessment.service');
async function save(req,complete=false){
 return transaction(async session=>{
  const audit=await lockAudit(req.auditScopeId,session,req.user);
  const currentUser=await require('../models/user.model').findById(req.user.id).session(session).lean();
  if(!currentUser?.isActive)throw auditError(403,'Standard writer is no longer active.');
  const scope=await require('../middleware/auth.middleware').getPermissionScope(currentUser.role,'audit.execution','update');
  const profile=await require('../models/auditorProfile.model').findById(req.user.id).session(session).lean();
  const access=await require('../middleware/auditScope.middleware').getAuditScopeFilter({user:{id:req.user.id,role:currentUser.role,departmentId:currentUser.departmentId},permission:{scope},auditorProfile:profile||undefined});
  if(!access||!await require('../models/audit.model').exists({$and:[{_id:audit._id},access]}).session(session))throw auditError(403,'Standard write access changed.');
  if(audit.auditType!=='standard'||await require('../models/auditClosure.model').exists({auditId:audit._id}).session(session))throw auditError(409,'Standard audit is not writable.');
  const row=await Execution.findOne({_id:req.executionId,auditId:audit._id}).session(session);
  if(!row||!row.templateSnapshot?.standardSource)throw auditError(409,'A reviewed Standard source revision is required.');
  if(!['draft','in-progress'].includes(row.status)||['completed','cancelled','archived'].includes(audit.status))throw auditError(409,'Completed Standard answers are immutable.');
  if(!Number.isInteger(req.body.expectedVersion)||req.body.expectedVersion!==(row.standardVersion||0))throw auditError(409,'Standard draft changed. Reload before saving.');
  const context=await require('../models/auditContext.model').findById(audit._id).session(session);
  if(!row.templateRevisionId||String(context?.templateRevisionId)!==String(row.templateRevisionId)||String(audit.templateRevisionId)!==String(row.templateRevisionId))throw auditError(409,'Standard revision linkage is invalid.');
  const details=standard.normalizeDetails(row.templateSnapshot,req.body.details);
  const assessment=standard.assessStandard(row.templateSnapshot,req.body.answers,complete,details);
  const finalIds=[details.finalEvidence.photoId,...details.finalEvidence.documentIds,...Object.values(details.sectionPhotos)].filter(Boolean);
  if(new Set([details.finalEvidence.photoId,...details.finalEvidence.documentIds].filter(Boolean)).size!==[details.finalEvidence.photoId,...details.finalEvidence.documentIds].filter(Boolean).length)throw auditError(400,'Duplicate Standard final attachment.');
  for(const id of finalIds){
   if(!require('mongoose').isObjectIdOrHexString(id))throw auditError(400,'Invalid Standard final evidence.');
   const file=await require('../models/auditEvidence.model').findOne({_id:id,auditId:audit._id}).session(session).lean();
   if(!file||(id===details.finalEvidence.photoId||Object.values(details.sectionPhotos).includes(id))&&(typeof file.mimeType!=='string'||!file.mimeType.startsWith('image/')))throw auditError(400,'Final evidence must belong to this Standard audit; a photo must be an image.');
  }
  const answers=req.body.answers.map(a=>({questionId:a.questionId,answer:a.answer,comment:standard.text(a.comment),score:null}));
  const evidence=req.body.evidenceLinks||[];
  const questionIds=new Set(row.templateSnapshot.sections.flatMap(s=>s.questions.map(q=>q.id)));
  if(!Array.isArray(evidence)||evidence.length>200)throw auditError(400,'Invalid Standard evidence links.');
  for(const link of evidence){
   if(!link||!questionIds.has(link.questionId)||!require('mongoose').isObjectIdOrHexString(link.evidenceId)||!await require('../models/auditEvidence.model').exists({_id:link.evidenceId,auditId:audit._id}).session(session))throw auditError(400,'Evidence must belong to this Standard audit.');
  }
  for(const observation of details.criterionObservations)await require('./serviceAuditEvidence.service').validate(observation.evidenceIds,audit._id,session);
  if(complete){
   const Finding=require('../models/auditFinding.model');
   for(const answer of answers.filter(a=>['critical','major','minor'].includes(a.answer))){
    const q=row.templateSnapshot.sections.flatMap(s=>s.questions).find(q=>q.id===answer.questionId);
    const observations=details.criterionObservations.filter(o=>o.standardId===q.id);
    const items=observations.length?observations:[{id:'answer',description:answer.comment,evidenceIds:[]}];
    for(const observation of items){
     const evidenceIds=[...new Set([...observation.evidenceIds,...evidence.filter(l=>l.questionId===q.id).map(l=>l.evidenceId)])];
     await Finding.create([{auditId:audit._id,executionId:row._id,standardId:q.id,catalogVersion:row.templateSnapshot.standardSource.version,code:`STD-${row._id}-${q.id}-${observation.id}`,sourceRisk:q.sourceRisk||null,title:q.label.slice(0,500),description:observation.description,severity:answer.answer,category:'compliance',evidenceIds}],{session});
    }
   }
  }
  row.answers=answers;row.standardDetails={...details,evidenceLinks:evidence.map(({questionId,evidenceId})=>({questionId,evidenceId}))};row.standardVersion=(row.standardVersion||0)+1;
  if(complete)row.standardSubmission={actorId:req.user.id,name:currentUser.name||'',at:new Date()};
  row.status=complete?'completed':'in-progress';Object.assign(row,assessment);row.totalScore=null;row.riskLevel='unscored';await row.save({session});
  audit.checks=answers;audit.standardDetails=row.standardDetails;if(complete)audit.standardSubmission=row.standardSubmission;Object.assign(audit,assessment);audit.status='in-progress';await audit.save({session});
  await recordHistory(audit,req.user,`standard-${complete?'submitted':'draft-saved'}-v${row.standardVersion}`,session);
  await require('../models/standardAuditSave.model').create([{_id:`${row._id}:${row.standardVersion}`,auditId:audit._id,executionId:row._id,version:row.standardVersion,actor:req.user.id,at:new Date(),status:row.status,answers,details:row.standardDetails,assessment,submission:row.standardSubmission||null}],{session});
  return row;
 });
}
module.exports={save};
module.exports.requireSubmitted=async(audit,session)=>{
 const row=await Execution.findOne({auditId:audit._id,templateRevisionId:audit.templateRevisionId,status:'completed'}).session(session);
 if(!row?.templateSnapshot?.standardSource||!row.standardAssessment?.complete)throw auditError(409,'Submit the Standard form before approval closure or completion.');
 return row;
};
