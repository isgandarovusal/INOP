const Execution=require('../models/auditExecution.model');
const {transaction,auditError}=require('./auditTransaction.service');
const {lockAudit,recordHistory}=require('./auditLifecycle.service');
const hse=require('./hseAuditAssessment.service');
async function save(req,complete=false){
 return transaction(async session=>{
  const audit=await lockAudit(req.auditScopeId,session,req.user);
  const currentUser=await require('../models/user.model').findById(req.user.id).session(session).lean();
  if(!currentUser?.isActive)throw auditError(403,'HSE writer is no longer active.');
  const scope=await require('../middleware/auth.middleware').getPermissionScope(currentUser.role,'audit.execution','update');
  const profile=await require('../models/auditorProfile.model').findById(req.user.id).session(session).lean();
  const access=await require('../middleware/auditScope.middleware').getAuditScopeFilter({user:{id:req.user.id,role:currentUser.role,departmentId:currentUser.departmentId},permission:{scope},auditorProfile:profile||undefined});
  if(!access||!await require('../models/audit.model').exists({$and:[{_id:audit._id},access]}).session(session))throw auditError(403,'HSE write access changed.');
  if(audit.auditType!=='occupational-safety'||await require('../models/auditClosure.model').exists({auditId:audit._id}).session(session))throw auditError(409,'HSE audit is not writable.');
  if(audit.hseObjectType!=='restaurant')await require('./hseObjectAccess.service').lockGrant(req.user,profile,scope,audit.hseObjectId,session);
  const row=await Execution.findOne({_id:req.executionId,auditId:audit._id}).session(session);
  if(!row||!row.templateSnapshot?.hseSource)throw auditError(409,'A reviewed HSE source revision is required.');
  if(!['draft','in-progress'].includes(row.status)||['completed','cancelled','archived'].includes(audit.status))throw auditError(409,'Completed HSE answers are immutable.');
  if(!Number.isInteger(req.body.expectedVersion)||req.body.expectedVersion!==(row.hseVersion||0))throw auditError(409,'HSE draft changed. Reload before saving.');
  const context=await require('../models/auditContext.model').findById(audit._id).session(session);
  if(!row.templateRevisionId||String(context?.templateRevisionId)!==String(row.templateRevisionId)||String(audit.templateRevisionId)!==String(row.templateRevisionId))throw auditError(409,'HSE revision linkage is invalid.');
  if(audit.hseObjectType!==row.templateSnapshot.hseSource.objectType||!audit.hseObjectId)throw auditError(409,'HSE object binding is invalid.');
  const details=hse.normalizeDetails(row.templateSnapshot,req.body.details);
  const assessment=hse.assessHse(row.templateSnapshot,req.body.answers,complete,details);
  const finalIds=[details.finalEvidence.photoId,...details.finalEvidence.documentIds,...Object.values(details.sectionPhotos)].filter(Boolean);
  if(new Set([details.finalEvidence.photoId,...details.finalEvidence.documentIds].filter(Boolean)).size!==[details.finalEvidence.photoId,...details.finalEvidence.documentIds].filter(Boolean).length)throw auditError(400,'Duplicate HSE final attachment.');
  for(const id of finalIds){
   if(!require('mongoose').isObjectIdOrHexString(id))throw auditError(400,'Invalid HSE final evidence.');
   const file=await require('../models/auditEvidence.model').findOne({_id:id,auditId:audit._id}).session(session).lean();
   if(!file||(id===details.finalEvidence.photoId||Object.values(details.sectionPhotos).includes(id))&&(typeof file.mimeType!=='string'||!file.mimeType.startsWith('image/')))throw auditError(400,'Final evidence must belong to this HSE audit; a photo must be an image.');
  }
  const answers=req.body.answers.map(a=>({questionId:a.questionId,answer:a.answer,comment:hse.text(a.comment),score:null}));
  const evidence=req.body.evidenceLinks||[];
  const questionIds=new Set(row.templateSnapshot.sections.flatMap(s=>s.questions.map(q=>q.id)));
  if(!Array.isArray(evidence)||evidence.length>200)throw auditError(400,'Invalid HSE evidence links.');
  for(const link of evidence){
   if(!link||!questionIds.has(link.questionId)||!require('mongoose').isObjectIdOrHexString(link.evidenceId)||!await require('../models/auditEvidence.model').exists({_id:link.evidenceId,auditId:audit._id}).session(session))throw auditError(400,'Evidence must belong to this HSE audit.');
  }
  for(const observation of details.criterionObservations)await require('./serviceAuditEvidence.service').validate(observation.evidenceIds,audit._id,session);
  if(complete){
   const Finding=require('../models/auditFinding.model');
   for(const answer of answers.filter(a=>a.answer==='noncompliant')){
    const q=row.templateSnapshot.sections.flatMap(s=>s.questions).find(q=>q.id===answer.questionId);
    const observations=details.criterionObservations.filter(o=>o.standardId===q.id);
    const items=observations.length?observations:[{id:'answer',description:answer.comment,evidenceIds:[]}];
    for(const observation of items){
     const evidenceIds=[...new Set([...observation.evidenceIds,...evidence.filter(l=>l.questionId===q.id).map(l=>l.evidenceId)])];
     await Finding.create([{auditId:audit._id,executionId:row._id,standardId:q.id,catalogVersion:row.templateSnapshot.hseSource.version,code:`HSE-${row._id}-${q.id}-${observation.id}`,sourceRisk:q.sourceRisk||null,title:q.label.slice(0,500),description:observation.description,severity:q.sourceRisk||null,category:'safety',evidenceIds}],{session});
    }
   }
  }
  row.answers=answers;row.hseDetails={...details,evidenceLinks:evidence.map(({questionId,evidenceId})=>({questionId,evidenceId}))};row.hseVersion=(row.hseVersion||0)+1;
  if(complete)row.hseSubmission={actorId:req.user.id,name:currentUser.name||'',at:new Date()};
  row.status=complete?'completed':'in-progress';Object.assign(row,assessment);row.totalScore=null;row.riskLevel='unscored';await row.save({session});
  audit.checks=answers;audit.hseDetails=row.hseDetails;if(complete)audit.hseSubmission=row.hseSubmission;Object.assign(audit,assessment);audit.status='in-progress';await audit.save({session});
  await recordHistory(audit,req.user,`hse-${complete?'submitted':'draft-saved'}-v${row.hseVersion}`,session);
  await require('../models/hseAuditSave.model').create([{_id:`${row._id}:${row.hseVersion}`,auditId:audit._id,executionId:row._id,version:row.hseVersion,actor:req.user.id,at:new Date(),status:row.status,answers,details:row.hseDetails,assessment,submission:row.hseSubmission||null}],{session});
  return row;
 });
}
module.exports={save};
module.exports.requireSubmitted=async(audit,session)=>{
 const row=await Execution.findOne({auditId:audit._id,templateRevisionId:audit.templateRevisionId,status:'completed'}).session(session);
 if(!row?.templateSnapshot?.hseSource||!row.hseAssessment?.complete)throw auditError(409,'Submit the HSE form before approval closure or completion.');
 return row;
};
