const mongoose=require('mongoose');
const hr=require('../services/hrAuditAssessment.service');
const {transaction,auditError}=require('../services/auditTransaction.service');
const Audit=require('../models/audit.model');
const Restaurant=require('../models/restaurant.model');
const Template=require('../models/auditTemplate.model');
const Revision=require('../models/auditTemplateRevision.model');
const Binding=require('../models/hrAuditSourceBinding.model');
const {getAuditScopeFilter}=require('../middleware/auditScope.middleware');
const fail=(res,e)=>res.status(e.status||(['ValidationError','CastError'].includes(e.name)?400:500)).json({message:e.status?e.message:'HR audit operation failed.'});
exports.hrOnly=(req,res,next)=>req.auditorProfile&&!require('../services/auditDirection.service').hasDirection(req.auditorProfile,'hr')?res.status(403).json({message:'HR audit direction required.'}):(req.auditRequestedDirection='hr',next());
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
    const revision=await Revision.findById(existing.revisionId).session(session);
    if(!revision||revision.content?.hrSource?.sha256!==source.sha256||revision.content?.hrSource?.version!==source.version)throw auditError(409,'Existing binding does not pin the current source version; preserve historical revisions and review provisioning.');
    hr.verifiedSource(revision.content);return existing;
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
  const scope=await getAuditScopeFilter(req);if(!scope)throw auditError(403,'HR restaurant access denied.');
  const ids=await Audit.distinct('restaurantId',{$and:[scope,{auditType:'hr'}]}).maxTimeMS(5000);filter={$and:[filter,{id:{$in:ids}}]};
 }
 return Restaurant.find(filter).select('id name brandId organizationId').sort({name:1}).maxTimeMS(5000).lean();
}
exports.restaurants=async(req,res)=>{try{res.json({data:await allowedRestaurants(req)});}catch(e){fail(res,e);}};
exports.create=async(req,res)=>{
 try{
  const {brandId,restaurantId,date}=req.body;
  if(typeof restaurantId!=='string'||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date).getTime())||new Date(date).toISOString().slice(0,10)!==date)throw auditError(400,'Invalid HR audit date or restaurant.');
  const source=hr.sourceFor(brandId);if(!source)throw auditError(400,'Unknown HR audit brand.');
  const restaurant=(await allowedRestaurants(req)).find(r=>r.id===restaurantId&&r.brandId===brandId);
  if(!restaurant)throw auditError(403,'Restaurant is outside your HR audit access.');
  const binding=await Binding.findById(hr.bindingKey(source)).lean();if(!binding)throw auditError(409,'An audit manager must provision the reviewed source template first.');
  const revision=await Revision.findById(binding.revisionId).lean();if(!revision)throw auditError(409,'Source revision is unavailable.');hr.verifiedSource(revision.content);
  const row=await require('../services/auditCreation.service').createAuditWithDepartmentSnapshot({id:`hr-${require('node:crypto').randomUUID()}`,auditType:'hr',restaurantId,date,templateId:String(binding.templateId)},req.user);
  res.status(201).json({data:row});
 }catch(e){fail(res,e);}
};
exports.analytics=async(req,res)=>{
 try{const authority=await require('../services/auditAnalyticsAuthority.service').capture(req);
  const filter=await require('./auditDirectionAnalytics.controller').filterFor({user:req.user,auditorProfile:req.auditorProfile,permission:req.permission,query:req.query,params:{direction:'hr'}});
  const parts=[filter,{auditType:'hr'}];
  const scalar=k=>require('../services/auditQuery.service').scalar(req.query[k],k);const auditor=scalar('auditorId'),sectionId=scalar('sectionId');if(auditor)parts.push({auditorId:auditor});if(sectionId)parts.push({'templateSnapshot.sections.id':sectionId});
  if(req.query.status){if(!['draft','scheduled','in-progress','completed','cancelled','failed'].includes(req.query.status))throw auditError(400,'Unknown HR audit status.');parts.push({status:req.query.status});}
  const data=await require('../services/auditNumericAnalytics.service').aggregate(req,'hr',{$and:parts});if(!await require('../services/auditAnalyticsAuthority.service').recheck(req,res,authority))return;res.json({data});
 }catch(e){fail(res,e);}
};
exports.list=async(req,res)=>{
 try{
  const filter=await require('./auditDirectionAnalytics.controller').filterFor({user:req.user,auditorProfile:req.auditorProfile,permission:req.permission,query:req.query,params:{direction:'hr'}});
  const filters=[filter,{auditType:'hr'}];
  if(req.query.status){if(!['draft','scheduled','in-progress','completed','cancelled','failed'].includes(req.query.status))throw auditError(400,'Unknown HR status.');filters.push({status:req.query.status});}
  const window=require('../services/auditQuery.service').pagination(req,25),query={$and:filters};
  const [items,total]=await Promise.all([Audit.find(query).select('id _id restaurantId date status assessmentStatus overallPercentage templateSnapshot.brandId hrAssessment.contract').sort({date:-1,_id:-1}).skip(window.skip).limit(window.limit).maxTimeMS(5000).lean(),Audit.countDocuments(query).maxTimeMS(5000)]);
  res.json({items,total,page:window.page,limit:window.limit});
 }catch(e){fail(res,e);}
};
