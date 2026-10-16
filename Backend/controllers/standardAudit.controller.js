const mongoose=require('mongoose');
const standard=require('../services/standardAuditAssessment.service');
const {transaction,auditError}=require('../services/auditTransaction.service');
const Audit=require('../models/audit.model');
const Restaurant=require('../models/restaurant.model');
const Template=require('../models/auditTemplate.model');
const Revision=require('../models/auditTemplateRevision.model');
const Binding=require('../models/standardAuditSourceBinding.model');
const {getAuditScopeFilter}=require('../middleware/auditScope.middleware');
const fail=(res,e)=>res.status(e.status||(['ValidationError','CastError'].includes(e.name)?400:500)).json({message:e.status?e.message:'Standard audit operation failed.'});
exports.standardOnly=(req,res,next)=>{
 if(req.auditorProfile&&req.auditorProfile.direction!=='standard')return res.status(403).json({message:'Standard audit direction required.'});
 if(req.user.role==='auditor'&&req.auditorProfile?.direction==='standard'&&req.permission.scope==='all')req.permission={...req.permission,scope:'assigned'};
 next();
};
exports.sources=async(req,res)=>{
 try{const brands=await require('../services/auditAudience.service').visibleBrands(req);const data=await Promise.all(standard.sources.filter(source=>brands.includes(source.brandId)).map(async source=>{
  const binding=await Binding.findById(standard.bindingKey(source)).lean();
  const template=binding&&await Template.findOne({_id:binding.templateId,status:'active',publishedRevisionId:binding.revisionId}).select('_id').lean();
  return {...source,templateId:template?String(template._id):null};
 }));res.json({data});}catch(e){fail(res,e);}
};
exports.provision=async(req,res)=>{
 try{
  if(!['admin','audit_manager'].includes(req.user.role)||req.permission.scope!=='all'||await require('../middleware/auth.middleware').getPermissionScope(req.user.role,'audit.template','create')!=='all')throw auditError(403,'Explicit audit template management permission required.');
  if(req.auditorProfile&&!(await require('../services/auditAudience.service').visibleBrands(req)).includes(req.params.brandId))throw auditError(403,'Template brand is outside your assignment.');
  const content=standard.contentFor(req.params.brandId),source=standard.sourceFor(req.params.brandId),key=standard.bindingKey(source);
  const data=await transaction(async session=>{
   const existing=await Binding.findById(key).session(session);
   if(existing){
    const template=await Template.findById(existing.templateId).session(session);
    if(!template||template.status!=='active'||String(template.publishedRevisionId)!==String(existing.revisionId))throw auditError(409,'Existing source template changed or retired; reviewed versioning is required.');
    standard.verifiedSource((await Revision.findById(existing.revisionId).session(session)).content);return existing;
   }
   const templateId=new mongoose.Types.ObjectId(),revisionId=new mongoose.Types.ObjectId();
   await Binding.create([{_id:key,templateId,revisionId}],{session});
   await Template.create([{...content,_id:templateId,status:'active',revisionCounter:1,publishedRevisionId:revisionId,createdBy:req.user.id,updatedBy:req.user.id}],{session});
   await Revision.create([{_id:revisionId,templateId,revision:1,content,publishedBy:req.user.id,publishedAt:new Date()}],{session});
   return {templateId,revisionId};
  });res.status(201).json({data});
 }catch(e){fail(res,e);}
};
async function allowedRestaurants(req){
 let filter={organizationId:'gfc',brandId:{$in:standard.sources.map(s=>s.brandId)},archivedAt:null};
 if(req.permission.scope!=='all'||req.auditorProfile){
  const scope=await getAuditScopeFilter(req);if(!scope)throw auditError(403,'Standard restaurant access denied.');
  const ids=await Audit.distinct('restaurantId',{$and:[scope,{auditType:'standard'}]}).maxTimeMS(5000);filter={$and:[filter,{id:{$in:ids}}]};
 }
 return Restaurant.find(filter).select('id name brandId organizationId').sort({name:1}).maxTimeMS(5000).lean();
}
exports.restaurants=async(req,res)=>{try{res.json({data:await allowedRestaurants(req)});}catch(e){fail(res,e);}};
exports.create=async(req,res)=>{
 try{
  const {brandId,restaurantId,date}=req.body;
  if(typeof restaurantId!=='string'||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date).getTime())||new Date(date).toISOString().slice(0,10)!==date)throw auditError(400,'Invalid Standard audit date or restaurant.');
  const source=standard.sourceFor(brandId);if(!source)throw auditError(400,'Unknown Standard audit brand.');
  const restaurant=(await allowedRestaurants(req)).find(r=>r.id===restaurantId&&r.brandId===brandId);
  if(!restaurant)throw auditError(403,'Restaurant is outside your Standard audit access.');
  const binding=await Binding.findById(standard.bindingKey(source)).lean();if(!binding)throw auditError(409,'An audit manager must provision the reviewed source template first.');
  const revision=await Revision.findById(binding.revisionId).lean();if(!revision)throw auditError(409,'Source revision is unavailable.');standard.verifiedSource(revision.content);
  const row=await require('../services/auditCreation.service').createAuditWithDepartmentSnapshot({id:`standard-${require('node:crypto').randomUUID()}`,auditType:'standard',restaurantId,date,templateId:String(binding.templateId)},req.user);
  res.status(201).json({data:row});
 }catch(e){fail(res,e);}
};
exports.list=async(req,res)=>{
 try{
  const filter=await require('./auditDirectionAnalytics.controller').filterFor({user:req.user,auditorProfile:req.auditorProfile,permission:req.permission,query:req.query,params:{direction:'standard'}});
  const filters=[filter,{auditType:'standard'}];
  if(req.query.status){if(!['draft','scheduled','in-progress','completed','cancelled','failed'].includes(req.query.status))throw auditError(400,'Unknown Standard status.');filters.push({status:req.query.status});}
  const window=require('../services/auditQuery.service').pagination(req,25),query={$and:filters};
  const [items,total]=await Promise.all([Audit.find(query).select('id _id restaurantId date status assessmentStatus overallPercentage templateSnapshot.brandId standardAssessment.contract').sort({date:-1,_id:-1}).skip(window.skip).limit(window.limit).maxTimeMS(5000).lean(),Audit.countDocuments(query).maxTimeMS(5000)]);
  res.json({items,total,page:window.page,limit:window.limit});
 }catch(e){fail(res,e);}
};
const MAX_ANALYTICS_AUDITS=500;
exports.analytics=async(req,res)=>{
 try{
  const filter=await require('./auditDirectionAnalytics.controller').filterFor({user:req.user,auditorProfile:req.auditorProfile,permission:req.permission,query:req.query,params:{direction:'standard'}});
  const clauses=[filter,{auditType:'standard','templateSnapshot.standardSource':{$exists:true}}];
  const scalar=(key,max=100)=>{const value=req.query[key];if(value!==undefined&&(typeof value!=='string'||value.length>max))throw auditError(400,'Invalid Standard analytics filter.');return value;};
  const status=scalar('status');if(status)clauses.push({status});
  const auditorId=scalar('auditorId');if(auditorId)clauses.push({$or:[{'standardSubmission.actorId':auditorId},{standardSubmission:{$exists:false},auditorId}]});
  const catalogVersion=scalar('catalogVersion');if(catalogVersion)clauses.push({'templateSnapshot.standardSource.version':catalogVersion});
  const area=scalar('area');if(area){const restaurants=await Restaurant.find({location:area,organizationId:'gfc'}).select('id').lean();clauses.push({restaurantId:{$in:restaurants.map(r=>r.id)}});}
  const sectionId=scalar('sectionId'),risk=scalar('risk'),result=scalar('result'),category=scalar('category',200);
  if(risk&&!['critical','major','minor','unspecified'].includes(risk)||result&&!standard.results.includes(result))throw auditError(400,'Unknown Standard risk/result.');
  const parents=await Audit.find({$and:clauses}).select('_id restaurantId auditorId date status templateSnapshot.brandId').limit(MAX_ANALYTICS_AUDITS+1).maxTimeMS(5000).lean();if(parents.length>MAX_ANALYTICS_AUDITS)throw auditError(422,'Narrow the Standard analytics range (maximum 500 audits).');
  const ids=parents.map(p=>p._id),byId=new Map(parents.map(p=>[String(p._id),p]));
  const executions=await require('../models/auditExecution.model').find({auditId:{$in:ids},status:'completed','templateSnapshot.standardSource':{$exists:true}}).select('auditId answers standardAssessment templateSnapshot.brandId templateSnapshot.brandName templateSnapshot.standardSource templateSnapshot.sections.id templateSnapshot.sections.title templateSnapshot.sections.category templateSnapshot.sections.questions.id templateSnapshot.sections.questions.label templateSnapshot.sections.questions.sourceRisk').limit(MAX_ANALYTICS_AUDITS+1).maxTimeMS(5000).lean();if(executions.length>MAX_ANALYTICS_AUDITS)throw auditError(422,'Narrow the Standard analytics range (maximum 500 audits).');
  const counts=()=>({total:0,applicable:0,na:0,unanswered:0,compliant:0,critical:0,major:0,minor:0,percentage:null});
  const total=counts(),groups={brands:new Map(),restaurants:new Map(),sections:new Map(),criteria:new Map(),trend:new Map()},seen=new Set();
  const add=(map,id,label,answer)=>{if(!map.has(id))map.set(id,{id,label,...counts()});const c=map.get(id);c.total++;if(answer){c[answer]++;if(answer!=='na')c.applicable++;}else c.unanswered++;};
  for(const e of executions){if(!e.standardAssessment?.complete||seen.has(String(e.auditId)))continue;const p=byId.get(String(e.auditId));const answers=new Map(e.answers.map(a=>[a.questionId,a.answer]));let matched=false;
   for(const s of e.templateSnapshot.sections)for(const q of s.questions){const answer=answers.get(q.id);if(sectionId&&s.id!==sectionId||category&&s.category!==category||risk&&(q.sourceRisk||'unspecified')!==risk||result&&answer!==result)continue;matched=true;total.total++;if(answer){total[answer]++;if(answer!=='na')total.applicable++;}else total.unanswered++;
    add(groups.brands,e.templateSnapshot.brandId,e.templateSnapshot.brandName,answer);add(groups.restaurants,p.restaurantId,p.restaurantId,answer);add(groups.sections,s.id,s.title,answer);add(groups.criteria,q.id,q.label,answer);add(groups.trend,p.date.slice(0,7),p.date.slice(0,7),answer);
   }if(matched)seen.add(String(e.auditId));
  }
  const childCount=async(resource,Model)=>{const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,resource,'read');if(!scope||scope==='none')return null;const allowed=await getAuditScopeFilter({...req,permission:{scope}});if(!allowed)return null;const visible=await Audit.find({$and:[{_id:{$in:[...seen]}},allowed]}).select('_id').lean();return Model.aggregate([{$match:{auditId:{$in:visible.map(a=>a._id)}}},{$group:{_id:{status:'$status',responsible:'$responsible'},count:{$sum:1}}}]).option({maxTimeMS:5000});};
  const [actions,findings]=await Promise.all([childCount('audit.action',require('../models/auditAction.model')),childCount('audit.finding',require('../models/auditFinding.model'))]);
  if(actions?.length){const responsibleIds=[...new Set(actions.map(a=>a._id.responsible).filter(id=>require('mongoose').isObjectIdOrHexString(id)))];const people=await require('../models/user.model').find({_id:{$in:responsibleIds}}).select('name').lean();const names=new Map(people.map(p=>[String(p._id),p.name]));for(const a of actions)a.responsibleName=names.get(String(a._id.responsible))||'';}
  const restaurants=await Restaurant.find({id:{$in:parents.map(p=>p.restaurantId)}}).select('id name location').lean(),names=new Map(restaurants.map(r=>[r.id,r.name]));
  const rate=c=>c.applicable?c.compliant/c.applicable*100:null;total.percentage=rate(total);
  const output=Object.fromEntries(Object.entries(groups).map(([k,map])=>[k,[...map.values()].map(row=>({...row,percentage:rate(row),label:k==='restaurants'?names.get(row.id)||row.id:row.label}))]));
  res.json({data:{counts:total,total:parents.length,completed:seen.size,coverage:{restaurants:new Set(parents.map(p=>p.restaurantId)).size,brands:new Set(parents.map(p=>p.templateSnapshot?.brandId)).size},statuses:parents.reduce((m,p)=>({...m,[p.status]:(m[p.status]||0)+1}),{}),...output,actions,findings,reason:total.applicable?null:'all-not-applicable',generatedAt:new Date().toISOString()}});
 }catch(e){fail(res,e);}
};
