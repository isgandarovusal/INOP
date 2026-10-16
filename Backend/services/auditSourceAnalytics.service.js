const Audit=require('../models/audit.model');
const {getAuditScopeFilter}=require('../middleware/auditScope.middleware');
const {auditError}=require('./auditTransaction.service');
const condition=(test,yes=1,no=0)=>({$cond:[test,yes,no]});
const sum=test=>({$sum:condition(test)});
const eq=value=>({$eq:['$qs.answer',value]});
function counts(kind){const c={total:{$sum:1},applicable:sum({$in:['$qs.answer',kind==='hse'?['compliant','noncompliant']:['compliant','critical','major','minor']]}),na:sum(eq('na')),unanswered:sum({$in:[{$ifNull:['$qs.answer','']},['','unanswered']]}),compliant:sum(eq('compliant'))};
 if(kind==='standard')for(const r of ['critical','major','minor'])c[r]=sum(eq(r));
 else Object.assign(c,{noncompliant:sum(eq('noncompliant')),critical:sum({$and:[eq('noncompliant'),{$eq:['$qs.sourceRisk','critical']}]}),weightEarned:{$sum:condition(eq('compliant'),{$ifNull:['$qs.weight',0]})},weightTotal:{$sum:condition({$in:['$qs.answer',['compliant','noncompliant']]},{$ifNull:['$qs.weight',0]})}});return c;
}
async function child(req,resource){const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,resource,'read');if(!scope||scope==='none')return null;return getAuditScopeFilter({...req,permission:{scope}});}
const run=pipeline=>Audit.aggregate(pipeline).option({allowDiskUse:true,maxTimeMS:15000});
async function aggregate(req,kind,filter){
 try{
 const [actionScope,findingScope]=await Promise.all([child(req,'audit.action'),child(req,'audit.finding')]);
 const eField=kind+'Assessment';
 const answerFor={$let:{vars:{a:{$arrayElemAt:[{$filter:{input:{$ifNull:['$e.answers',[]]},as:'a',cond:{$eq:['$$a.questionId','$$q.id']}}},0]}},in:{$ifNull:['$$a.answer','']}}};
 const questionObject={$mergeObjects:['$$q',{sectionId:'$$this.id',sectionTitle:'$$this.title',category:'$$this.category',answer:answerFor}]};
 const questions={$reduce:{input:{$ifNull:['$e.templateSnapshot.sections',[]]},initialValue:[],in:{$concatArrays:['$$value',{$map:{input:{$ifNull:['$$this.questions',[]]},as:'q',in:questionObject}}]}}};
 const base=[
  {$match:filter},
  {$lookup:{from:require('../models/auditExecution.model').collection.name,let:{audit:'$_id',revision:'$templateRevisionId'},pipeline:[
   {$match:{$expr:{$and:[{$eq:['$auditId','$$audit']},{$eq:['$templateRevisionId','$$revision']},{$eq:['$status','completed']}]},['templateSnapshot.'+kind+'Source']:{$exists:true}}},
   {$sort:{updatedAt:-1,_id:-1}},{$limit:1},{$project:{answers:1,templateSnapshot:1,[eField]:1,overallPercentage:1,passed:1}}
  ],as:'execution'}},
  {$set:{e:{$arrayElemAt:['$execution',0]}}},
  {$project:{execution:0,templateSnapshot:0,checks:0,hrDetails:0,serviceDetails:0,standardDetails:0,hseDetails:0}},
  {$set:{qs:questions}}
 ];
 const tests=[];if(req.query.sectionId)tests.push({$eq:['$$q.sectionId',req.query.sectionId]});if(req.query.category)tests.push({$eq:['$$q.category',req.query.category]});if(req.query.risk)tests.push({$eq:[{$ifNull:['$$q.sourceRisk','unspecified']},req.query.risk]});if(req.query.result)tests.push({$eq:['$$q.answer',req.query.result]});
 base.push({$set:{qs:{$filter:{input:'$qs',as:'q',cond:tests.length?{$and:tests}:true}}}},{ $set:{qualified:{$and:[{$eq:['$e.'+eField+'.complete',true]},{$gt:[{$size:'$qs'},0]}]}}});
 const question=[{$match:{qualified:true}},{$unwind:'$qs'}];
 const group=(id,label,objectType)=>[...question,{$group:{_id:id,label:{$first:label},...(objectType?{objectType:{$first:objectType}}:{}),...counts(kind)}},{$sort:{_id:1}}];
 const facets={summary:[{$group:{_id:null,total:{$sum:1},completed:sum('$qualified'),objects:{$addToSet:{$ifNull:['$hseObjectId','$restaurantId']}},restaurants:{$addToSet:'$restaurantId'},brands:{$addToSet:'$e.templateSnapshot.brandId'},passed:sum({$and:['$qualified',{$eq:['$hseObjectType','restaurant']},{$eq:['$e.hseAssessment.passed',true]}]}),failed:sum({$and:['$qualified',{$eq:['$hseObjectType','restaurant']},{$eq:['$e.hseAssessment.passed',false]}]}),unassessed:sum({$and:['$qualified',{$eq:['$hseObjectType','restaurant']},{$eq:[{$ifNull:['$e.hseAssessment.passed',null]},null]}]})}}],statuses:[{$group:{_id:'$status',count:{$sum:1}}}],counts:[...question,{$group:{_id:null,...counts(kind)}}],sections:group('$qs.sectionId','$qs.sectionTitle',kind==='hse'?'$hseObjectType':null),criteria:group('$qs.id','$qs.label',kind==='hse'?'$hseObjectType':null),trend:group(kind==='hse'?{$concat:['$hseObjectType',':',{$substrBytes:['$date',0,7]}]}:{$substrBytes:['$date',0,7]},{$substrBytes:['$date',0,7]},kind==='hse'?'$hseObjectType':null)};
 if(kind==='hse')facets.groups=group('$hseObjectType','$hseObjectType','$hseObjectType');
 else{facets.brands=group('$e.templateSnapshot.brandId','$e.templateSnapshot.brandName');facets.restaurants=group('$restaurantId','$restaurantId');}
 const childStages=(scope,model)=>[{$match:scope},...(kind==='standard'?[{$match:{qualified:true}}]:[]),{$lookup:{from:require('../models/'+model+'.model').collection.name,localField:'_id',foreignField:'auditId',as:'child'}},{$unwind:'$child'},...(model==='auditAction'&&req.query.actionStatus?[{$match:{'child.status':req.query.actionStatus}}]:[])];
 if(actionScope)facets.actions=[...childStages(actionScope,'auditAction'),{$group:{_id:{status:'$child.status',responsible:'$child.responsible'},count:{$sum:1},overdue:sum({$and:[{$ne:[{$ifNull:['$child.dueDate',null]},null]},{$lt:['$child.dueDate',new Date()]},{$not:[{$in:['$child.status',['completed','verified']]}]}]})}}];
 if(findingScope)facets.findings=[...childStages(findingScope,'auditFinding'),{$group:{_id:{status:'$child.status'},count:{$sum:1},critical:sum({$or:[{$eq:['$child.sourceRisk','critical']},{$eq:['$child.severity','critical']}]})}}];
 const [raw]=await run([...base,{$facet:facets}]);const summary=raw.summary[0]||{},status=Object.fromEntries(raw.statuses.map(s=>[s._id,s.count]));
 const empty=Object.fromEntries(Object.keys(counts(kind)).map(k=>[k,0]));
 const normalize=c=>{const {_id,...rest}=c;return{...rest,...(_id!==null?{id:_id}:{}),percentage:c.applicable?c.compliant/c.applicable*100:null,...(kind==='hse'?{weightedPercentage:c.objectType!=='restaurant'&&c.weightTotal?c.weightEarned/c.weightTotal*100:null}:{})};};
 const common={total:summary.total||0,completed:summary.completed||0,statuses:status,sections:raw.sections.map(normalize),criteria:raw.criteria.map(normalize),trend:raw.trend.map(normalize),generatedAt:new Date().toISOString(),aggregation:'server-side',completeRange:true};
 if(kind==='standard'){
 const restaurants=await require('../models/restaurant.model').find({id:{$in:raw.restaurants.map(r=>r._id)}}).select('id name').lean(),names=new Map(restaurants.map(r=>[r.id,r.name]));
 const people=actionScope?await require('../models/user.model').find({_id:{$in:raw.actions.map(a=>a._id.responsible).filter(v=>require('mongoose').isObjectIdOrHexString(v))}}).select('name').lean():[],peopleNames=new Map(people.map(p=>[String(p._id),p.name]));
 return{...common,counts:normalize(raw.counts[0]||{_id:null,...empty}),coverage:{restaurants:(summary.restaurants||[]).filter(Boolean).length,brands:(summary.brands||[]).filter(Boolean).length},brands:raw.brands.map(normalize),restaurants:raw.restaurants.map(r=>({...normalize(r),label:names.get(r._id)||r._id})),actions:actionScope?raw.actions.map(a=>({...a,responsibleName:peopleNames.get(a._id.responsible)||''})):null,findings:findingScope?raw.findings:null,reason:(raw.counts[0]?.applicable)?null:'all-not-applicable'};
 }
 const actions=raw.actions||[];return{...common,coverage:(summary.objects||[]).filter(Boolean).length,overallPercentage:null,overallReason:'GFC aggregate methodology is not approved.',groups:raw.groups.map(normalize),restaurantOutcomes:{passed:summary.passed||0,failed:summary.failed||0,unassessed:summary.unassessed||0},actions:actionScope?{total:actions.reduce((n,a)=>n+a.count,0),open:actions.filter(a=>!['completed','verified'].includes(a._id.status)).reduce((n,a)=>n+a.count,0),overdue:actions.reduce((n,a)=>n+a.overdue,0),closed:actions.filter(a=>a._id.status==='verified').reduce((n,a)=>n+a.count,0),byResponsible:actions.reduce((out,a)=>{const id=a._id.responsible||'unassigned';out[id]=(out[id]||0)+a.count;return out;},{})}:null,findings:findingScope?{total:raw.findings.reduce((n,f)=>n+f.count,0),critical:raw.findings.reduce((n,f)=>n+f.critical,0)}:null};
 }catch(e){if([50,146,292,10334].includes(e.code))throw auditError(422,'Analytics exceeded the server resource budget; narrow the date range. No partial results were returned.');throw e;}
}
module.exports={aggregate};
