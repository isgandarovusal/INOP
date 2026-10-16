const mongoose=require('mongoose');
const hr=require('../services/serviceAuditAssessment.service');
const {transaction,auditError}=require('../services/auditTransaction.service');
const Audit=require('../models/audit.model');
const Restaurant=require('../models/restaurant.model');
const Template=require('../models/auditTemplate.model');
const Revision=require('../models/auditTemplateRevision.model');
const Binding=require('../models/serviceAuditSourceBinding.model');
const {getAuditScopeFilter}=require('../middleware/auditScope.middleware');
const fail=(res,e)=>res.status(e.status||(['ValidationError','CastError'].includes(e.name)?400:500)).json({message:e.status?e.message:'Service audit operation failed.'});
exports.serviceOnly=(req,res,next)=>{
 if(req.auditorProfile&&req.auditorProfile.direction!=='service')return res.status(403).json({message:'Service audit direction required.'});
 if(req.user.role==='auditor'&&req.auditorProfile?.direction==='service'&&req.permission.scope==='all')req.permission={...req.permission,scope:'assigned'};
 next();
};
exports.sources=async(req,res)=>{
 try{const brands=await require('../services/auditAudience.service').visibleBrands(req);const data=await Promise.all(hr.sources.filter(source=>brands.includes(source.brandId)).map(async source=>{
  const binding=await Binding.findById(hr.bindingKey(source)).lean();
  const template=binding&&await Template.findOne({_id:binding.templateId,status:'active',publishedRevisionId:binding.revisionId}).select('_id').lean();
  return {...source,templateId:template?String(template._id):null};
 }));res.json({data});}catch(e){fail(res,e);}
};
exports.provision=async(req,res)=>{
 try{
  if(!['admin','audit_manager'].includes(req.user.role)||req.permission.scope!=='all'||await require('../middleware/auth.middleware').getPermissionScope(req.user.role,'audit.template','create')!=='all')throw auditError(403,'Explicit audit template management permission required.');
  if(req.auditorProfile&&!(await require('../services/auditAudience.service').visibleBrands(req)).includes(req.params.brandId))throw auditError(403,'Template brand is outside your assignment.');
  const content=hr.contentFor(req.params.brandId),source=hr.sourceFor(req.params.brandId),key=hr.bindingKey(source);
  const data=await transaction(async session=>{
   const existing=await Binding.findById(key).session(session);
   if(existing){
    const template=await Template.findById(existing.templateId).session(session);
    if(!template||template.status!=='active'||String(template.publishedRevisionId)!==String(existing.revisionId))throw auditError(409,'Existing source template changed or retired; reviewed versioning is required.');
    hr.verifiedSource((await Revision.findById(existing.revisionId).session(session)).content);return existing;
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
 let filter={organizationId:'gfc',brandId:{$in:hr.sources.map(s=>s.brandId)},archivedAt:null};
 if(req.permission.scope!=='all'||req.auditorProfile){
  const scope=await getAuditScopeFilter(req);if(!scope)throw auditError(403,'Service restaurant access denied.');
  const ids=await Audit.distinct('restaurantId',{$and:[scope,{auditType:'service'}]}).maxTimeMS(5000);filter={$and:[filter,{id:{$in:ids}}]};
 }
 return Restaurant.find(filter).select('id name brandId organizationId').sort({name:1}).maxTimeMS(5000).lean();
}
exports.restaurants=async(req,res)=>{try{res.json({data:await allowedRestaurants(req)});}catch(e){fail(res,e);}};
exports.create=async(req,res)=>{
 try{
  const {brandId,restaurantId,date}=req.body;
  if(typeof restaurantId!=='string'||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date).getTime())||new Date(date).toISOString().slice(0,10)!==date)throw auditError(400,'Invalid Service audit date or restaurant.');
  const source=hr.sourceFor(brandId);if(!source)throw auditError(400,'Unknown Service audit brand.');
  const restaurant=(await allowedRestaurants(req)).find(r=>r.id===restaurantId&&r.brandId===brandId);
  if(!restaurant)throw auditError(403,'Restaurant is outside your Service audit access.');
  const binding=await Binding.findById(hr.bindingKey(source)).lean();if(!binding)throw auditError(409,'An audit manager must provision the reviewed source template first.');
  const revision=await Revision.findById(binding.revisionId).lean();if(!revision)throw auditError(409,'Source revision is unavailable.');hr.verifiedSource(revision.content);
  const row=await require('../services/auditCreation.service').createAuditWithDepartmentSnapshot({id:`service-${require('node:crypto').randomUUID()}`,auditType:'service',restaurantId,date,templateId:String(binding.templateId)},req.user);
  res.status(201).json({data:row});
 }catch(e){fail(res,e);}
};
exports.analytics=async(req,res)=>{
 try{
  const filter=await require('./auditDirectionAnalytics.controller').filterFor({user:req.user,auditorProfile:req.auditorProfile,permission:req.permission,query:req.query,params:{direction:'service'}});
  const parts=[filter,{auditType:'service'}];
  if(req.query.status){if(!['draft','scheduled','in-progress','completed','cancelled','failed'].includes(req.query.status))throw auditError(400,'Unknown Service audit status.');parts.push({status:req.query.status});}
  const audits=await Audit.find({$and:parts}).select('_id restaurantId date status templateSnapshot.brandId').limit(5001).maxTimeMS(5000).lean();
  if(audits.length>5000)throw auditError(422,'Narrow the Service analytics date range (maximum 5000 audits).');
  const ids=audits.map(a=>a._id),parents=new Map(audits.map(a=>[String(a._id),a]));
  const executions=await require('../models/auditExecution.model').find({auditId:{$in:ids},status:'completed','templateSnapshot.auditType':'service'}).select('auditId templateSnapshot.brandId templateSnapshot.serviceSource templateSnapshot.sections serviceAssessment overallPercentage answers').limit(5001).maxTimeMS(5000).lean();
  if(executions.length>5000)throw auditError(422,'Narrow the Service analytics date range.');
  const groups={brands:new Map(),restaurants:new Map(),sections:new Map(),criteria:new Map(),trend:new Map()};
  const add=(map,id,label,score)=>{if(!map.has(id))map.set(id,{id,label,count:0,scored:0,sum:0});const row=map.get(id);row.count++;if(typeof score==='number'&&Number.isFinite(score)){row.scored++;row.sum+=score;}return row;};
  let sum=0,scored=0,nonconformities=0,legacyConformityExclusions=0;
  const seen=new Set();
  for(const row of executions){
   // Stored server assessment only. Never recalculate historical answers.
   if(seen.has(String(row.auditId))||!row.templateSnapshot?.serviceSource||!row.serviceAssessment?.complete)continue;seen.add(String(row.auditId));
   const parent=parents.get(String(row.auditId));const source=hr.sourceFor(row.templateSnapshot.brandId,row.templateSnapshot.serviceSource.version);
   if(!source)continue;
   const score=row.overallPercentage;
   if(typeof score==='number'&&Number.isFinite(score)){sum+=score;scored++;}
   add(groups.brands,source.brandId,source.brandName,score);add(groups.restaurants,parent.restaurantId,parent.restaurantId,score);add(groups.trend,parent.date.slice(0,7),parent.date.slice(0,7),score);
   for(const section of row.serviceAssessment.sections||[])add(groups.sections,`${source.brandId}:${section.id}`,section.title,section.percentage);
   for(const answer of row.answers||[]){
    const q=row.templateSnapshot.sections.flatMap(s=>s.questions).find(q=>q.id===answer.questionId);if(!q)continue;
    // Preserve historical totals, but never label an old negative answer as new conformity.
    if(hr.needsConformityReview(row.templateSnapshot)&&q.id===hr.NEGATIVE_CRITERION){if(['0','0.5','1'].includes(answer.answer))legacyConformityExclusions++;continue;}
    const rawValue=['0','0.5','1'].includes(answer.answer)?Number(answer.answer):null;
    const value=rawValue!==null&&typeof answer.score==='number'&&[0,0.5,1].includes(answer.score)?answer.score:null;
    const item=add(groups.criteria,q.id,q.label,value===null?null:value*100);
    item.na=(item.na||0)+(answer.answer==='na'?1:0);item.nonconformities=(item.nonconformities||0)+(rawValue!==null&&rawValue<1?1:0);
    if(rawValue!==null&&rawValue<1)nonconformities++;
   }
  }
  const restaurants=await Restaurant.find({id:{$in:audits.map(a=>a.restaurantId)}}).select('id name').maxTimeMS(5000).lean();const names=new Map(restaurants.map(r=>[r.id,r.name]));
  const order={brands:hr.sources.map(s=>s.brandId),sections:hr.sources.flatMap(s=>s.sections.map(sec=>`${s.brandId}:${sec.id}`)),criteria:hr.sources.flatMap(s=>s.sections.flatMap(sec=>sec.questions.map(q=>q.id)))};
  const output=Object.fromEntries(Object.entries(groups).map(([key,map])=>[key,[...map.values()].map(({sum,...r})=>({...r,label:key==='restaurants'?(names.get(r.id)||r.id):r.label,average:r.scored?sum/r.scored:null})).sort((a,b)=>order[key]?order[key].indexOf(a.id)-order[key].indexOf(b.id):a.id.localeCompare(b.id))]));
  const countByStatus=async(resource,Model)=>{
   const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,resource,'read');
   if(!scope||scope==='none')return null;
   const childScope=await getAuditScopeFilter({...req,permission:{scope}});if(!childScope)return null;
   const childParents=await Audit.find({$and:[{_id:{$in:ids}},childScope]}).select('_id').lean();
   return Model.aggregate([{$match:{auditId:{$in:childParents.map(a=>a._id)}}},{$group:{_id:'$status',count:{$sum:1}}}]).option({maxTimeMS:5000});
  };
  const [actions,findings]=await Promise.all([countByStatus('audit.action',require('../models/auditAction.model')),countByStatus('audit.finding',require('../models/auditFinding.model'))]);
  res.json({data:{statuses:audits.reduce((out,a)=>({...out,[a.status]:(out[a.status]||0)+1}),{}),total:audits.length,submitted:seen.size,scored,unscored:seen.size-scored,average:scored?sum/scored:null,nonconformities,legacyConformityExclusions,...output,actions,findings,scoreUnit:'percent',generatedAt:new Date().toISOString()}});
 }catch(e){fail(res,e);}
};
exports.list=async(req,res)=>{
 try{
  const filter=await require('./auditDirectionAnalytics.controller').filterFor({user:req.user,auditorProfile:req.auditorProfile,permission:req.permission,query:req.query,params:{direction:'service'}});
  const filters=[filter,{auditType:'service'}];
  if(req.query.status){if(!['draft','scheduled','in-progress','completed','cancelled','failed'].includes(req.query.status))throw auditError(400,'Unknown Service status.');filters.push({status:req.query.status});}
  const window=require('../services/auditQuery.service').pagination(req,25),query={$and:filters};
  const [items,total]=await Promise.all([Audit.find(query).select('id _id restaurantId date status assessmentStatus overallPercentage templateSnapshot.brandId serviceAssessment.contract').sort({date:-1,_id:-1}).skip(window.skip).limit(window.limit).maxTimeMS(5000).lean(),Audit.countDocuments(query).maxTimeMS(5000)]);
  res.json({items,total,page:window.page,limit:window.limit});
 }catch(e){fail(res,e);}
};
