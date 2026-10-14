const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Legacy analytics honor canonical filters, units, unscored and latest windows',async()=>withAuditFixture(async h=>{
 const Restaurant=require('../models/restaurant.model');await Restaurant.create({id:'pizza',name:'Synthetic',organizationId:'gfc',brandId:'pizza-hut'});
 const kfcAudit=await h.audit('auditor','service',{overallPercentage:80,date:'2026-01-01'});await h.audit('auditor','service',{overallPercentage:0,date:'2026-02-01'});
 await h.audit('auditor','service',{overallPercentage:null,assessmentStatus:'legacy-unscored',date:'2026-03-01'});
 const pizzaAudit=await h.audit('admin','service',{restaurantId:'pizza',overallPercentage:100});await h.audit('admin','safety',{scorePercentage:50});
 const row=(await h.request('admin','GET','/audit-analytics/service?brandId=kfc')).data.data;
 assert.equal(row.total,3);assert.equal(row.scored,2);assert.equal(row.unscored,1);assert.equal(row.averageOverallPercentage,40);assert.equal(row.scoreUnit,'percent');assert.equal(row.averageServiceTimeSeconds,null);
 assert.deepEqual((await h.request('admin','GET','/audit-analytics/service?brandId=kfc&limit=2')).data.data.trend.map(r=>r.label),['2026-02-01','2026-03-01']);
 const types=(await h.request('admin','GET','/audit-analytics/type')).data.data.typeSummary;assert.ok(types.some(row=>row.name==='occupational-safety'&&row.value===1));
 const overview=(await h.request('admin','GET','/audit-analytics/overview?direction=service&brandId=kfc')).data.data;assert.equal(overview.averageScore,4);
 assert.equal((await h.request('auditor','GET','/audit-analytics/safety')).data.data.total,0);
 assert.equal((await h.request('admin','GET','/audit-analytics/safety')).data.data.averageScorePercentage,50);
 for(const path of ['summary','type','trend','service','standard','safety']){
  assert.equal((await h.request('admin','GET',`/audit-analytics/${path}?brandId=gfc`)).status,400);
  assert.equal((await h.request('anonymous','GET',`/audit-analytics/${path}`)).status,401);
 }
 assert.equal((await h.request('admin','GET','/audit-analytics/service?direction=standard')).status,400);
 await h.models.Execution.create({auditId:kfcAudit._id,status:'completed',totalScore:10});await h.models.Execution.create({auditId:pizzaAudit._id,status:'completed',totalScore:20});const dashboard=(await h.request('admin','GET','/audit-dashboard?direction=service&brandId=kfc')).data.data;assert.equal(dashboard.averageScore,10);assert.equal(dashboard.scoredExecutions,1);assert.equal(dashboard.scoreUnit,'raw-points');assert.equal((await h.request('admin','GET','/audit-dashboard?brandId=gfc')).status,400);

 assert.equal((await h.request('admin','GET','/audit-analytics/service?brandId=kfc&restaurantId=pizza')).status,400);
 for(const value of ['limit=0','page=-1','limit=201','dateFrom=2026-02-30','direction[$ne]=hr'])assert.equal((await h.request('admin','GET','/audits?'+value)).status,400);
 assert.ok(Array.isArray((await h.request('admin','GET','/audits')).data));const page=(await h.request('admin','GET','/audits?format=page&page=2&limit=2')).data;assert.equal(page.total,5);assert.equal(page.items.length,2);
 const empty=(await h.request('admin','GET','/audit-analytics/standard')).data.data;assert.equal(empty.averageCompliancePercentage,null);assert.equal(empty.failed,0);
 const aggregate=h.models.Audit.aggregate;h.models.Audit.aggregate=()=>{throw Error('Synthetic failure');};try{const failure=await h.request('admin','GET','/audit-analytics/service');assert.equal(failure.status,500);assert.equal(failure.data.success,false);}finally{h.models.Audit.aggregate=aggregate;}
}));
test('Mounted actions enforce parent isolation, server provenance, review and finding closure',async()=>withAuditFixture(async h=>{
 const own=await h.audit('auditor','service'),other=await h.audit('admin','standard');
 const finding=await h.models.Finding.create({auditId:own._id,title:'Synthetic only'});
 const denied=await h.request('auditor','POST','/audit-actions',{auditId:other.id,title:'Denied'});assert.equal(denied.status,403);
 const created=await h.request('auditor','POST','/audit-actions',{auditId:own.id,title:'Synthetic action',findingId:String(finding._id),status:'verified',verifiedBy:String(h.actors.admin._id)});
 assert.equal(created.status,201);const action=created.data.data;assert.equal(action.status,'open');assert.equal(action.createdBy,String(h.actors.auditor._id));assert.equal(action.verifiedBy,undefined);
 assert.equal((await h.request('admin','PATCH',`/audit-findings/${finding._id}/status`,{status:'closed'})).status,409);
 assert.equal((await h.request('auditor','PUT',`/audit-actions/${action._id}/status`,{status:'completed'})).status,200);
 assert.equal((await h.request('auditor','PUT',`/audit-actions/${action._id}/status`,{status:'verified'})).status,403);
 const verified=await h.request('admin','PUT',`/audit-actions/${action._id}/status`,{status:'verified',verifiedBy:'forged'});assert.equal(verified.status,200);assert.equal(verified.data.data.verifiedBy,String(h.actors.admin._id));
 assert.equal((await h.request('admin','PATCH',`/audit-findings/${finding._id}/status`,{status:'closed'})).status,200);
 assert.equal((await h.request('auditor','GET',`/audit-actions/audit/${other.id}`)).status,403);
 assert.equal((await h.request('admin','POST','/audit-actions',{auditId:other.id,title:'Bad link',findingId:String(finding._id)})).status,400);
 const ownAction=(await h.request('admin','POST','/audit-actions',{auditId:other.id,title:'Admin-created synthetic'})).data.data;assert.equal((await h.request('admin','PUT',`/audit-actions/${ownAction._id}/status`,{status:'completed'})).status,200);assert.equal((await h.request('admin','PUT',`/audit-actions/${ownAction._id}/status`,{status:'verified'})).status,403);
}));
test('Source extraction uses real bytes, explicit permission, CAS and archived history',async()=>withAuditFixture(async h=>{
 const PDF=require('pdfkit'),pdf=new PDF(),chunks=[];pdf.on('data',c=>chunks.push(c));const bytes=await new Promise(resolve=>{pdf.on('end',()=>resolve(Buffer.concat(chunks)));pdf.text('Synthetic Audit source only');pdf.end();});
 const form=new FormData();form.set('file',new Blob([bytes],{type:'application/pdf'}),'synthetic.pdf');form.set('organizationId','gfc');form.set('brandId','kfc');form.set('auditType','service');
 const response=await fetch(h.apiBase+'/audit-source-documents',{method:'POST',headers:{Authorization:'Bearer '+h.tokens.admin},body:form});assert.equal(response.status,201);const source=await response.json();
 try{
  assert.equal(source.filePath,undefined);assert.equal((await h.request('hr','POST',`/audit-source-documents/${source.id}/process`,{})).status,403);
  const results=await Promise.all([1,2].map(()=>h.request('admin','POST',`/audit-source-documents/${source.id}/process`,{})));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.match(results.find(r=>r.status===200).data.data.extractedData.text,/Synthetic Audit source only/);
  assert.equal((await h.request('admin','GET','/audit-source-documents?brandId=gfc')).status,400);
  await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:{$each:[{resource:'audit.source_document',action:'read',scope:'all'},{resource:'audit.source_document',action:'create',scope:'all'}]}}});await require('../models/auditorProfile.model').create({_id:h.actors.own._id,organizationId:'gfc',direction:'occupational-safety'});
  const alias=await require('../models/auditSourceDocument.model').findById(source.id).lean();alias._id=new h.mongoose.Types.ObjectId();alias.id='synthetic-alias-source';alias.auditType='safety';alias.status='uploaded';alias.extractedData=null;await require('../models/auditSourceDocument.model').collection.insertOne(alias);
  assert.equal((await h.request('own','POST',`/audit-source-documents/${alias._id}/process`,{})).status,200);assert.equal((await require('../models/auditSourceDocument.model').findById(alias._id)).auditType,'safety');

  assert.equal((await h.request('admin','DELETE',`/audit-source-documents/${source.id}`)).status,200);
  const stored=await require('../models/auditSourceDocument.model').findById(source.id);assert.ok(stored.archivedAt);
  assert.equal((await h.request('admin','GET',`/audit-source-documents/${source.id}/file`)).status,404);
  assert.ok((await h.request('admin','GET','/audit-source-documents')).data.every(row=>row.id!==source.id));
 }finally{const record=await require('../models/auditSourceDocument.model').findById(source.id);if(record)await require('node:fs/promises').unlink(require('node:path').join(require('../middleware/privateUpload.middleware').uploadsDir,record.fileName));}
}));
