const {brandIds}=require('./auditCatalog.service');
const {canonicalDirection,directions}=require('./auditDirection.service');
const collections=['users','restaurants','profiles','templates','revisions','contexts','assignments','executions','audits','evidence'];
const validators={
 AuditorProfile:{$jsonSchema:{bsonType:'object',required:['_id','organizationId','direction','active','version'],properties:{_id:{bsonType:'objectId'},organizationId:{enum:['gfc']},direction:{enum:directions},active:{bsonType:'bool'},version:{bsonType:['int','long','double'],minimum:0},history:{bsonType:'array'}}}},
 Restaurant:{$and:[{$jsonSchema:{bsonType:'object',properties:{organizationId:{enum:['gfc',null]},brandId:{enum:[...brandIds,null]}}}},{$or:[{brandId:null},{organizationId:'gfc',brandId:{$in:brandIds}}]}]},
 AuditTemplateRevision:{$jsonSchema:{bsonType:'object',required:['templateId','revision','content','publishedBy','publishedAt','state'],properties:{templateId:{bsonType:'objectId'},revision:{bsonType:['int','long','double'],minimum:1},content:{bsonType:'object'},publishedAt:{bsonType:'date'},state:{enum:['published','retired']}}}},
};
const indexes=[
 {collection:'audittemplaterevisions',key:{templateId:1,revision:1},options:{unique:true}},
 {collection:'auditassignments',key:{auditId:1,auditor:1},options:{unique:true,partialFilterExpression:{status:{$in:['assigned','accepted','started']}}}},
 {collection:'auditexecutions',key:{auditId:1,templateRevisionId:1},options:{unique:true,partialFilterExpression:{templateRevisionId:{$type:'objectId'}}}},
 {collection:'auditevidences',key:{'storageReference.provider':1,'storageReference.key':1},options:{unique:true,partialFilterExpression:{'storageReference.key':{$type:'string'}}}},
];
function analyze(snapshot){
 const issues=[],rows=name=>Array.isArray(snapshot[name])?snapshot[name]:[];
 for(const name of collections)if(!Array.isArray(snapshot[name]))issues.push({collection:name,status:'blocked',reason:'Snapshot collection missing; readiness unknown.'});
 const add=(collection,row,reason,status='blocked')=>issues.push({collection,id:String(row._id||row.id||''),reason,status});
 const unique=(name,key,filter=()=>true)=>{const seen=new Set();for(const row of rows(name).filter(filter)){const value=key(row);if(seen.has(value))add(name,row,'Duplicate unique-index candidate.');seen.add(value);}};
 unique('profiles',row=>String(row._id||row.userId));unique('revisions',row=>String(row.templateId)+':'+row.revision);
 unique('assignments',row=>String(row.auditId)+':'+row.auditor,row=>['assigned','accepted','started'].includes(row.status));
 unique('executions',row=>String(row.auditId)+':'+row.templateRevisionId,row=>Boolean(row.templateRevisionId));
 unique('evidence',row=>row.storageReference.provider+':'+row.storageReference.key,row=>Boolean(row.storageReference));
 for(const row of rows('profiles')){if(!/^[a-f0-9]{24}$/.test(String(row._id)))add('profiles',row,'Invalid Mongo user identity.');if(!rows('users').some(user=>String(user._id)===String(row._id)))add('profiles',row,'Orphan user reference.');const user=rows('users').find(user=>String(user._id)===String(row._id));if(row.active&&['admin','audit_manager'].includes(user?.role))add('profiles',row,'Management promotion/deactivation policy needs a separate decision.');if(row.organizationId!=='gfc'||!canonicalDirection(row.direction))add('profiles',row,'Unknown organization/direction.');else if(row.direction!==canonicalDirection(row.direction))add('profiles',row,'Explicit alias needs reviewed normalization.','partial');if(row.active&&['admin','audit_manager'].includes(row.role))add('profiles',row,'Management promotion/deactivation policy needs a separate decision.');}
 for(const row of rows('restaurants')){if(row.organizationId&&row.organizationId!=='gfc'||row.brandId&&!brandIds.includes(row.brandId))add('restaurants',row,'Unknown catalog relation.');else if(row.brandId&&row.organizationId!=='gfc')add('restaurants',row,'Brand needs reviewed GFC organization link.');else if(!row.brandId)add('restaurants',row,'Unmapped restaurant; no name-based inference.','partial');}
 for(const row of rows('revisions')){if(!Number.isInteger(row.revision)||row.revision<1||!rows('templates').some(template=>String(template._id)===String(row.templateId)))add('revisions',row,'Invalid revision number or orphan template reference.');}
 for(const row of rows('assignments')){const audit=rows('audits').find(audit=>String(audit._id)===String(row.auditId));if(!audit)add('assignments',row,'Orphan audit reference.');if(['assigned','accepted','started'].includes(row.status)){const profile=rows('profiles').find(profile=>String(profile._id)===String(row.auditor)&&profile.active);if(!profile||profile.direction!==canonicalDirection(audit?.auditType||audit?.type))add('assignments',row,'Active assignment/profile direction mismatch.');}}
 for(const row of rows('executions')){const audit=rows('audits').find(audit=>String(audit._id)===String(row.auditId));if(!audit)add('executions',row,'Orphan audit reference.');if(row.templateRevisionId&&String(row.templateRevisionId)!==String(audit?.templateRevisionId))add('executions',row,'Execution revision differs from bound audit revision.');}
 for(const row of rows('audits')){if(!canonicalDirection(row.auditType||row.type))add('audits',row,'Unknown legacy direction; no inferred mapping.');if(row.templateRevisionId){const revision=rows('revisions').find(revision=>String(revision._id)===String(row.templateRevisionId)),context=rows('contexts').find(context=>String(context._id)===String(row._id));if(!revision||!context||String(context.templateRevisionId)!==String(row.templateRevisionId))add('audits',row,'Missing revision or server context proof.');}if(!row.templateRevisionId)add('audits',row,'Unversioned legacy result; no automatic rescore/certification.','partial');if(!rows('restaurants').some(restaurant=>restaurant.id===row.restaurantId))add('audits',row,'Orphan restaurant reference.');}
 for(const row of rows('evidence')){if(!rows('audits').some(audit=>String(audit._id)===String(row.auditId)))add('evidence',row,'Orphan audit evidence reference.');if(!row.storageReference)add('evidence',row,'Legacy filesystem/blob evidence needs explicit custody review.','partial');}
 const transactionEvidence=Boolean(snapshot.topology?.setName||snapshot.topology?.msg==='isdbgrid');
 if(!transactionEvidence)issues.push({collection:'topology',status:'blocked',reason:'Snapshot has no transaction-capable topology evidence; no live topology was inspected.'});
 return {mode:'offline-dry-run',writes:0,productionVerified:false,transactionEvidence,collections:collections.map(name=>({name,count:rows(name).length})),issues,validators,indexes,readyForReviewedMigration:issues.length===0};
}
module.exports={analyze,validators,indexes};
