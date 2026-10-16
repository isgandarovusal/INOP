const {auditError}=require('./auditTransaction.service');
const LIMIT=5000;
const kindOf=a=>['hr','service','standard','hse'].find(k=>a.templateSnapshot?.[`${k}Source`]);
async function allowed(req,audit,resource,cache=new Map()){
 if(!req)return true;
 const scope=await require('../middleware/auth.middleware').getPermissionScope(req.user.role,resource,'read');
 if(!scope||scope==='none')return false;
 if(!cache.has(scope))cache.set(scope,(async()=>{
  const filter=await require('../middleware/auditScope.middleware').getAuditScopeFilter({...req,user:req.user,permission:{scope}});
  return Boolean(filter&&await require('../models/audit.model').exists({$and:[{_id:audit._id},filter]}));
 })());
 return cache.get(scope);
}
async function bounded(Model,query,sort,limit=LIMIT){
 const rows=await Model.find(query).sort(sort).limit(limit+1).maxTimeMS(10000).lean();
 if(rows.length>limit)throw auditError(422,'Audit report exceeds the safe export window. Narrow the report or request an approved archival export.');
 return rows;
}
async function build(audit,req){
 const kind=kindOf(audit),id=audit._id;
 const resources=['audit.finding','audit.action','audit.approval','audit.closure','audit','audit.activity','audit.execution'];
 const scopeCache=new Map();
 const permits=await Promise.all(resources.map(r=>allowed(req,audit,r,scopeCache)));
 const specs=[['findings','auditFinding.model',0,{createdAt:1}],['actions','auditAction.model',1,{createdAt:1}],['approvals','auditApproval.model',2,{createdAt:1}],['closures','auditClosure.model',3,{closedAt:1}],['evidence','auditEvidence.model',4,{createdAt:1}],['history','auditActivity.model',5,{createdAt:1}]];
 const result={};await Promise.all(specs.map(async([key,model,index,sort])=>{result[key]=permits[index]?await bounded(require(`../models/${model}`),{auditId:id},sort):null;}));
 const saves=kind&&permits[6]?await bounded(require(`../models/${kind}AuditSave.model`),{auditId:id},{version:1},100):null;
 const latest=saves?.filter(s=>s.status==='completed').at(-1);
 const snapshot=audit.templateSnapshot||{},details=latest?.details||audit[`${kind}Details`]||{},assessment=latest?.assessment?.[`${kind}Assessment`]||audit[`${kind}Assessment`]||{};
 const answers=latest?.answers||audit.checks||[];const answerMap=new Map(answers.map(a=>[a.questionId,a]));
 const links=[];const link=(evidenceId,level,target,slot)=>{if(evidenceId)links.push({evidenceId:String(evidenceId),level,target:String(target||''),slot:slot??null});};
 for(const l of details.evidenceLinks||[])link(l.evidenceId,'criterion',l.questionId);
 for(const [sid,eid]of Object.entries(details.sectionPhotos||{}))link(eid,'section',sid);
 link(details.finalEvidence?.photoId,'final-photo',id);
 (details.finalEvidence?.documentIds||[]).forEach((eid,slot)=>link(eid,'document',id,slot+1));
 for(const o of details.criterionObservations||[])for(const eid of o.evidenceIds||[])link(eid,'observation',o.id);
 for(const f of result.findings||[])for(const eid of f.evidenceIds||[])link(eid,'finding',f._id);
 for(const a of result.actions||[])for(const eid of a.evidenceIds||[])link(eid,'action',a._id);
 for(const f of result.findings||[])delete f.evidence;
 for(const h of result.history||[])delete h.metadata;
 const available=new Set((result.evidence||[]).map(e=>String(e._id)));
 result.evidence=(result.evidence||[]).map(e=>({id:String(e._id),auditId:String(id),name:e.name,mimeType:e.mimeType,size:e.size,uploadedAt:e.createdAt,uploadedBy:e.uploadedBy,url:`/api/audit-evidence/${e._id}/file`,links:links.filter(l=>l.evidenceId===String(e._id))}));
 const sections=(snapshot.sections||[]).map(s=>({id:s.id,title:s.title,category:s.category||'',note:details.sectionNotes?.[s.id]||'',photoId:available.has(details.sectionPhotos?.[s.id])?details.sectionPhotos[s.id]:'',result:assessment.sections?.find(r=>r.id===s.id)||null,criteria:(s.questions||[]).map(q=>{const a=answerMap.get(q.id);return{id:q.id,label:q.label,guidance:q.guidance||'',sourceCell:q.sourceCell||'',sourceRisk:q.sourceRisk??null,weight:q.weight??null,answer:a?.answer||'',score:a?.answer==='na'?null:a?.score??null,note:a?.comment||'',naReason:details.naReasons?.[q.id]||'',evidenceIds:links.filter(l=>l.level==='criterion'&&l.target===q.id&&available.has(l.evidenceId)).map(l=>l.evidenceId)};})}));
 const object=audit.hseObjectSnapshot||audit.standardRestaurantSnapshot||await require('../models/restaurant.model').findOne({id:audit.restaurantId}).select('id name brandId location').lean();
 const actor=await require('../models/user.model').findById(audit.hseSubmission?.actorId||audit.standardSubmission?.actorId||latest?.actor||audit.auditorId).select('name').lean();
 const brandId=kind==='hse'?object?.brandId:snapshot.brandId;
 const brand=require('./auditCatalog.service').brands.find(b=>b.id===brandId)?.name||'';
 const source=snapshot[`${kind}Source`]||{};
 return{kind,metadata:{auditId:String(id),reference:audit.id,direction:audit.auditType,organization:snapshot.organizationId||'gfc',brand,objectType:audit.hseObjectType||'restaurant',objectId:audit.hseObjectId||audit.restaurantId,objectName:object?.name||audit.restaurantId||'',date:audit.date,auditorName:audit.hseSubmission?.name||audit.standardSubmission?.name||actor?.name||'',auditorId:audit.hseSubmission?.actorId||audit.standardSubmission?.actorId||latest?.actor||audit.auditorId,revision:String(audit.templateRevisionId||''),catalogVersion:source.version||'',sourceHash:source.sha256||'',status:audit.status,submissionStatus:latest?.status||null},percentage:latest?.assessment?latest.assessment.overallPercentage??null:audit.assessmentStatus==='scored'?audit.overallPercentage??null:null,passed:latest?.assessment?latest.assessment.passed??null:audit.passed??null,assessment,sections:permits[6]?sections:[],observations:details.observations||'',finalOpinion:details.finalOpinion||'',finalEvidence:{photoId:available.has(details.finalEvidence?.photoId)?details.finalEvidence.photoId:'',documentIds:Array.from({length:3},(_,i)=>available.has(details.finalEvidence?.documentIds?.[i])?details.finalEvidence.documentIds[i]:'')},...result,saves:saves||null,restrictions:Object.fromEntries(resources.map((r,i)=>[r,!permits[i]]))};
}
async function recheck(req,res,audit,bundle,resource){
 await require('../middleware/auth.middleware').verifyToken(req,res,()=>{});if(res.headersSent)return false;
 req.auditorProfile=await require('../models/auditorProfile.model').findById(req.user.id).lean()||undefined;
 const cache=new Map();
 const resources=[resource,...Object.entries(bundle.restrictions).filter(([,restricted])=>!restricted).map(([r])=>r)];
 const permits=await Promise.all([...new Set(resources)].map(r=>allowed(req,audit,r,cache)));
 if(permits.some(v=>!v)){res.status(403).json({message:'Audit report access changed. Reload before retrying.'});return false;}
 return true;
}
module.exports={build,kindOf,LIMIT,recheck};
