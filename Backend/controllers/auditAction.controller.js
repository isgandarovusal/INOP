const mongoose=require('mongoose');
const Action=require('../models/auditAction.model');
const {transaction,auditError}=require('../services/auditTransaction.service');
const {lockAudit,recordHistory}=require('../services/auditLifecycle.service');
const {pagination}=require('../services/auditQuery.service');
const fail=(res,error)=>res.status(error.status||(error.name==='ValidationError'?400:500)).json({success:false,message:error.status?error.message:'Corrective action operation failed.'});
async function writable(req,session){const audit=await lockAudit(req.auditScopeId,session,req.user);if(await require('../models/auditClosure.model').exists({auditId:audit._id}).session(session))throw auditError(409,'Closed audit is immutable.');return audit;}
exports.createAction=async(req,res)=>{try{
 const row=await transaction(async session=>{
  const audit=await writable(req,session),body=req.body;
  if(audit.auditType==='hr'||(audit.templateSnapshot?.hrSource||audit.templateSnapshot?.serviceSource||audit.templateSnapshot?.standardSource||audit.templateSnapshot?.hseSource)){
   await require('../services/hrAuditPeople.service').requireResponsible(body.responsible,audit._id,session);
   if(typeof body.description!=='undefined'&&(typeof body.description!=='string'||body.description.length>4000))throw auditError(400,'Invalid HR action description.');
   if(body.dueDate&&(typeof body.dueDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)||!Number.isFinite(new Date(body.dueDate).getTime())||new Date(body.dueDate).toISOString().slice(0,10)!==body.dueDate))throw auditError(400,'Invalid HR action due date.');
  }
  if(typeof body.title!=='string'||!body.title.trim()||body.title.length>500)throw auditError(400,'Action title is required.');
  for(const[field,model]of[['findingId','auditFinding'],['executionId','auditExecution']])if(body[field]){
   if(!mongoose.isObjectIdOrHexString(body[field])||!await require('../models/'+model+'.model').exists({_id:body[field],auditId:audit._id}).session(session))throw auditError(400,'Action reference must belong to this audit.');
  }
  const extra=(audit.templateSnapshot?.hrSource||audit.templateSnapshot?.serviceSource||audit.templateSnapshot?.standardSource||audit.templateSnapshot?.hseSource)&&body.evidenceIds!==undefined?{evidenceIds:await require('../services/serviceAuditEvidence.service').validate(body.evidenceIds,audit._id,session)}:{};
  const [created]=await Action.create([{...extra,auditId:audit._id,createdBy:req.user.id,title:body.title.trim(),description:body.description,priority:body.priority,responsible:body.responsible,dueDate:body.dueDate,findingId:body.findingId,executionId:body.executionId,status:'open'}],{session});
  await recordHistory(audit,req.user,'action-created',session);return created;
 });res.status(201).json({success:true,data:row});
}catch(error){fail(res,error);}};
exports.getActions=async(req,res)=>{try{const window=pagination(req);let query=Action.find({auditId:req.auditScopeId}).sort({createdAt:-1,_id:-1}).maxTimeMS(5000);if(req.query.page!==undefined||req.query.limit!==undefined)query=query.skip(window.skip).limit(window.limit);res.json({success:true,data:await query});}catch(error){fail(res,error);}};
exports.updateActionStatus=async(req,res)=>{try{
 const row=await transaction(async session=>{
  const audit=await writable(req,session),action=await Action.findOne({_id:req.params.id,auditId:audit._id}).session(session);
  if(!action)throw auditError(404,'Action not found.');
  const next=req.body.status,graph={open:['in-progress','completed'],'in-progress':['completed'],completed:['verified','rejected'],rejected:['in-progress'],verified:[]};
  if(next===action.status)return action;
  if(!(graph[action.status]||[]).includes(next))throw auditError(409,'Invalid action transition.');
  if(next==='verified'||next==='rejected'){
   const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,'audit.approval','update');
   const reviewFilter=await require('../middleware/auditScope.middleware').getAuditScopeFilter({...req,permission:{scope}});
   if(!reviewFilter||!await require('../models/audit.model').exists({$and:[{_id:audit._id},reviewFilter]}).session(session))throw auditError(403,'Independent review permission required.');
   if(!action.createdBy)throw auditError(409,'Legacy action needs reviewed provenance.');
   if(action.createdBy===req.user.id||action.responsible===req.user.id)throw auditError(403,'Self-verification is forbidden.');
   action.verifiedBy=req.user.id;action.verificationNote=req.body.verificationNote||'';
  }
  if((audit.templateSnapshot?.hrSource||audit.templateSnapshot?.serviceSource||audit.templateSnapshot?.standardSource||audit.templateSnapshot?.hseSource)&&req.body.evidenceIds!==undefined)action.evidenceIds=await require('../services/serviceAuditEvidence.service').validate(req.body.evidenceIds,audit._id,session);
  if(next==='completed')action.completedAt=new Date();action.status=next;await action.save({session});await recordHistory(audit,req.user,'action-'+next,session);return action;
 });res.json({success:true,data:row});
}catch(error){fail(res,error);}};
