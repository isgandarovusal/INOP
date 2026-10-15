const {test}=require('node:test');const assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');const hr=require('../services/serviceAuditAssessment.service');
test('Service source provisioning, draft concurrency, evidence isolation, scoring, analytics, permissions and immutable closure',{timeout:90000},async()=>withAuditFixture(async h=>{
 const {actors,models}=h;const Profile=require('../models/auditorProfile.model');const Restaurant=require('../models/restaurant.model');
 await models.Role.updateMany({key:{$in:['test_own','test_assigned','test_department']}},{$push:{permissions:{$each:[{resource:'audit.execution',action:'*',scope:'own'},{resource:'audit.action',action:'*',scope:'own'}]}}});
 await Restaurant.create({id:'ph',name:'Synthetic PH',organizationId:'gfc',brandId:'pizza-hut'});
 await Restaurant.create({id:'ss',name:'Synthetic SS',organizationId:'gfc',brandId:'simit-sarayi'});
 const call=(actor,m,path,body)=>h.request(actor,m,path,body);
 assert.equal((await call('anonymous','GET','/audit-service/sources')).status,401);
 assert.equal((await call('hr','GET','/audit-service/sources')).status,403);
 assert.equal((await call('auditor','GET','/audit-service/sources')).status,200);
 const p=await call('admin','POST','/audit-service/templates/pizza-hut',{});assert.equal(p.status,201,JSON.stringify(p.data));
 const p2=await call('admin','POST','/audit-service/templates/pizza-hut',{});assert.equal(String(p2.data.data.templateId),String(p.data.data.templateId));
 const created=await call('admin','POST','/audit-service/audits',{brandId:'pizza-hut',restaurantId:'ph',date:'2026-10-15'});assert.equal(created.status,201,JSON.stringify(created.data));const audit=created.data.data;
 const directory=await call('admin','GET',`/audit-service/${audit._id}/action-people?q=%2E%2A`);assert.equal(directory.status,200);assert.deepEqual(directory.data.data,[]);
 assert.equal((await call('admin','POST','/audit-service/audits',{brandId:'pizza-hut',restaurantId:'ss',date:'2026-10-15'})).status,403);
 const e=await call('admin','POST','/audit-execution',{auditId:audit._id});assert.equal(e.status,201,JSON.stringify(e.data));const execution=e.data.data;
 const q=hr.contentFor('pizza-hut').sections.flatMap(s=>s.questions),answers=q.map((q,i)=>({questionId:q.id,answer:i===0?'0.5':'na',score:999,comment:'synthetic note'}));
 const body={answers:answers.slice(0,1),expectedVersion:0,details:{observations:'synthetic observation',sectionNotes:{'service-pizza-hut-s7':'synthetic section'}}};
 const draft=await call('admin','PUT',`/audit-execution/${execution._id}/service-draft`,body);assert.equal(draft.status,200,JSON.stringify(draft.data));assert.equal(draft.data.data.serviceVersion,1);assert.equal(draft.data.data.answers[0].score,0.5);
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/service-draft`,body)).status,409);
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/submit`,{...body,expectedVersion:1})).status,422);
 const foreign=await h.audit('foreign','service');const evidence=await require('../models/auditEvidence.model').create({auditId:foreign._id,storageKey:'synthetic',name:'synthetic',size:1,mimeType:'text/plain',uploadedBy:String(actors.foreign._id)});
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/service-draft`,{...body,expectedVersion:1,evidenceLinks:[{questionId:q[0].id,evidenceId:String(evidence._id)}]})).status,400);
 const submitted=await call('admin','PUT',`/audit-execution/${execution._id}/submit`,{answers,expectedVersion:1,details:body.details});assert.equal(submitted.status,200,JSON.stringify(submitted.data));assert.equal(submitted.data.data.overallPercentage,50);
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/service-draft`,{...body,expectedVersion:2})).status,409);
 const history=await call('admin','GET',`/audit-execution/${execution._id}/service-history`);assert.equal(history.data.data.length,2);assert.equal(history.data.data[1].details.observations,'synthetic observation');
 assert.equal((await call('foreign','GET',`/audit-execution/${execution._id}`)).status,403);
 const analytics=await call('admin','GET','/audit-service/analytics?brandId=pizza-hut');assert.equal(analytics.status,200,JSON.stringify(analytics.data));assert.equal(analytics.data.data.average,50);assert.equal(analytics.data.data.criteria.find(c=>c.id===q[0].id).average,50);assert.equal(analytics.data.data.submitted,1);
 assert.equal((await call('admin','GET','/audit-service/analytics?direction=hr')).status,400);
 await Profile.updateOne({_id:actors.auditor._id},{$set:{direction:'service'}});await h.assign('auditor',await models.Audit.findById(audit._id));
 assert.equal((await call('auditor','GET','/audit-service/list')).status,200);
 const options=await call('auditor','GET','/audit-service/options');assert.deepEqual(options.data.data.map(r=>r.id),['ph']);
 const isolated=await call('auditor','GET','/audit-service/analytics');assert.equal(isolated.status,200);assert.equal(isolated.data.data.total,1);assert.equal((await call('auditor','GET',`/audit-execution/${execution._id}`)).status,200);
 await h.models.Assignment.updateMany({auditId:audit._id,auditor:actors.auditor._id},{$set:{status:'revoked'}});assert.equal((await call('auditor','GET',`/audit-execution/${execution._id}`)).status,403);assert.equal((await call('auditor','GET','/audit-service/analytics')).data.data.total,0);
 await Profile.updateOne({_id:actors.auditor._id},{$set:{direction:'hr'}});assert.equal((await call('auditor','GET','/audit-service/list')).status,403);
 // Completed form can be independently approved and closed; no rescore of legacy records.
 const finding=await call('admin','POST','/audit-findings',{auditId:audit._id,title:'Synthetic finding',severity:'low'});assert.equal(finding.status,201);
 const findingId=finding.data.data._id;
 const action=await call('admin','POST','/audit-actions',{auditId:audit._id,title:'Synthetic action',responsible:String(actors.admin._id),findingId,status:'verified',dueDate:'2026-10-20'});assert.equal(action.status,201,JSON.stringify(action.data));assert.equal(action.data.data.status,'open');
 const actionId=action.data.data._id;
 assert.equal((await call('admin','PATCH',`/audit-findings/${findingId}/status`,{status:'closed'})).status,409);
 assert.equal((await call('admin','PUT',`/audit-actions/${actionId}/status`,{status:'completed'})).status,200);
 assert.equal((await call('admin','PUT',`/audit-actions/${actionId}/status`,{status:'verified'})).status,403);
 const Reviewer=await models.User.create({name:'Reviewer',email:'reviewer@example.invalid',password:'synthetic',role:'admin',departmentId:'dep_A',isActive:true});
 h.tokens.reviewer=require('jsonwebtoken').sign({id:String(Reviewer._id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
 assert.equal((await call('reviewer','PUT',`/audit-actions/${actionId}/status`,{status:'verified',verificationNote:'Synthetic independent review'})).status,200);
 assert.equal((await call('admin','PATCH',`/audit-findings/${findingId}/status`,{status:'closed'})).status,200);
 const approval=await call('admin','POST','/audit-approval',{auditId:audit._id,reviewer:String(Reviewer._id)});assert.equal(approval.status,201,JSON.stringify(approval.data));
 h.tokens.reviewer=require('jsonwebtoken').sign({id:String(Reviewer._id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
 const approvalId=approval.data.data?._id||approval.data._id;
 const decision=await call('reviewer','PATCH',`/audit-approval/${approvalId}`,{status:'approved'});assert.equal(decision.status,200,JSON.stringify(decision.data));
 const closed=await call('admin','POST','/audit-closure',{auditId:audit._id});assert.equal(closed.status,201,JSON.stringify(closed.data));
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/service-draft`,{...body,expectedVersion:2})).status,409);
 await assert.rejects(()=>require('../models/serviceAuditSave.model').updateOne({executionId:execution._id},{$set:{actor:'forged'}}));
}));

test('Service N/A persists neutrally through submission, analytics, report, Excel and history',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Restaurant=require('../models/restaurant.model'),XLSX=require('xlsx');
 for(const brand of ['pizza-hut','simit-sarayi','kfc']){
  assert.equal((await h.request('admin','POST',`/audit-service/templates/${brand}`,{})).status,201);
  const restaurantId=`na-${brand}`;await Restaurant.create({id:restaurantId,name:'Synthetic N/A restaurant',organizationId:'gfc',brandId:brand});
  for(const mixed of [false,true]){
   const created=await h.request('admin','POST','/audit-service/audits',{brandId:brand,restaurantId,date:'2026-10-15'});assert.equal(created.status,201);
   const auditId=created.data.data._id;
   const execution=await h.request('admin','POST','/audit-execution',{auditId});assert.equal(execution.status,201);
   const answers=hr.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'na',score:1})));
   if(mixed) ['0','0.5','1'].forEach((answer,i)=>{answers[i].answer=answer;});
   const response=await h.request('admin','PUT',`/audit-execution/${execution.data.data._id}/submit`,{answers,expectedVersion:0,details:{}});
   assert.equal(response.status,200,JSON.stringify(response.data));const saved=response.data.data;
   assert.equal(saved.overallPercentage,mixed?50:null);assert.equal(saved.assessmentStatus,mixed?'scored':'unscored');
   assert.equal(saved.serviceAssessment.applicable,mixed?3:0);assert.equal(saved.serviceAssessment.earned,mixed?1.5:0);
   assert.equal(saved.serviceAssessment.na,answers.length-(mixed?3:0));
   assert.ok(saved.answers.filter(a=>a.answer==='na').every(a=>a.score===null));
   const parent=await h.models.Audit.findById(auditId).lean();assert.equal(parent.overallPercentage,mixed?50:null);
   assert.equal(parent.checks.filter(a=>a.answer==='na').length,answers.length-(mixed?3:0));
   assert.equal(await h.models.Finding.countDocuments({auditId}),0);
   const history=await h.request('admin','GET',`/audit-execution/${saved._id}/service-history`);
   assert.equal(history.status,200);assert.equal(history.data.data[0].answers.filter(a=>a.answer==='na').length,answers.length-(mixed?3:0));
   const report=await h.request('admin','GET',`/audit-report/${auditId}`);assert.equal(report.status,200);assert.equal(report.data.data.score,mixed?50:null);
   const exported=await h.request('admin','GET',`/audit-export/${auditId}/excel`);assert.equal(exported.status,200);
   const workbook=XLSX.read(exported.buffer,{type:'buffer'});
   const rows=XLSX.utils.sheet_to_json(workbook.Sheets['Service Criteria']);assert.equal(rows.filter(r=>r.Answer==='na').length,answers.length-(mixed?3:0));
   const source=XLSX.utils.sheet_to_json(workbook.Sheets['Service Source'])[0];assert.equal(source.OverallPercentage,mixed?50:'');
   const stats=await h.request('admin','GET',`/audit-service/analytics?brandId=${brand}`);assert.equal(stats.status,200);const data=stats.data.data;
   assert.equal(data.average,mixed?50:null);assert.equal(data.scored,mixed?1:0);assert.equal(data.unscored,1);
   assert.equal(data.nonconformities,mixed?2:0);
   assert.ok(data.criteria.filter(c=>!mixed||!answers.slice(0,3).some(a=>a.questionId===c.id)).every(c=>c.average===null&&c.nonconformities===0));
  }
 }
}));


test('Service photo/document/section history and corrective-action evidence are bound and immutable',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Restaurant=require('../models/restaurant.model'),Evidence=require('../models/auditEvidence.model'),storage=require('../services/auditEvidenceStorage.service');const owned=[];
 try{for(const source of hr.sources){
  await Restaurant.create({id:`photos-${source.brandId}`,name:'Synthetic photo restaurant',organizationId:'gfc',brandId:source.brandId});await h.request('admin','POST',`/audit-service/templates/${source.brandId}`,{});
  const created=await h.request('admin','POST','/audit-service/audits',{brandId:source.brandId,restaurantId:`photos-${source.brandId}`,date:'2026-10-15'});assert.equal(created.status,201);const auditId=created.data.data._id;
  const started=await h.request('admin','POST','/audit-execution',{auditId});assert.equal(started.status,201);const id=started.data.data._id;
  const upload=async(bytes,mime,name)=>{const body=new FormData();body.append('file',new Blob([bytes],{type:mime}),name);const response=await fetch(h.apiBase+`/audit-evidence/${auditId}`,{method:'POST',headers:{Authorization:`Bearer ${h.tokens.admin}`},body});assert.equal(response.status,201);const data=await response.json();const file=await Evidence.findById(data.data.id).lean();owned.push(file);assert.deepEqual((await h.request('admin','GET',`/audit-evidence/${file._id}/file`)).buffer,bytes);return String(file._id);};
  const photo=await upload(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),'image/png','synthetic.png');const docs=[];for(let n=0;n<3;n++)docs.push(await upload(Buffer.from(`Synthetic service ${n}`),'text/plain',`service-${n}.txt`));
  const snapshot=hr.contentFor(source.brandId),answers=snapshot.sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'0.5',comment:'Synthetic criterion note'})));
  const payload={answers,expectedVersion:0,details:{observations:'Synthetic additional observation',finalOpinion:'Synthetic opinion',sectionNotes:{[snapshot.sections[0].id]:'Synthetic section note'},sectionPhotos:{[snapshot.sections[0].id]:photo},finalEvidence:{photoId:photo,documentIds:docs}},evidenceLinks:[{questionId:answers[0].questionId,evidenceId:photo}]};
  const saves=await Promise.all([h.request('admin','PUT',`/audit-execution/${id}/service-draft`,payload),h.request('admin','PUT',`/audit-execution/${id}/service-draft`,payload)]);assert.deepEqual(saves.map(r=>r.status).sort(),[200,409]);payload.expectedVersion=1;
  const foreign=await h.audit('foreign','service');const other=await Evidence.create({auditId:foreign._id,storageKey:'synthetic',name:'foreign.png',size:1,mimeType:'image/png',uploadedBy:String(h.actors.foreign._id)});
  const bad={...payload,details:{...payload.details,sectionPhotos:{[snapshot.sections[0].id]:String(other._id)}}};assert.equal((await h.request('admin','PUT',`/audit-execution/${id}/service-draft`,bad)).status,400);
  const extra={...payload,details:{...payload.details,finalEvidence:{photoId:photo,documentIds:[...docs,photo]}}};assert.equal((await h.request('admin','PUT',`/audit-execution/${id}/service-draft`,extra)).status,400);
  assert.equal((await h.request('admin','PATCH',`/audit-workflow/${auditId}/status`,{status:'completed'})).status,409);
  const submitted=await h.request('admin','PUT',`/audit-execution/${id}/submit`,payload);assert.equal(submitted.status,200);assert.equal(submitted.data.data.overallPercentage,50);
  const history=await h.request('admin','GET',`/audit-execution/${id}/service-history`);assert.equal(history.data.data.length,2);assert.deepEqual(history.data.data[0].details.finalEvidence,payload.details.finalEvidence);assert.equal(history.data.data[0].details.sectionPhotos[snapshot.sections[0].id],photo);
  const finding=await h.request('admin','POST','/audit-findings',{auditId,title:'Synthetic source finding',description:'Synthetic observation',evidenceIds:[photo]});assert.equal(finding.status,201);assert.deepEqual(finding.data.data.evidenceIds,[photo]);
  const rejected=await h.request('admin','POST','/audit-actions',{auditId,title:'Invalid proof action',responsible:String(h.actors.admin._id),evidenceIds:[String(other._id)]});assert.equal(rejected.status,400);
  const action=await h.request('admin','POST','/audit-actions',{auditId,title:'Synthetic proof action',responsible:String(h.actors.admin._id),findingId:finding.data.data._id,dueDate:'2026-10-20'});assert.equal(action.status,201);
  const completed=await h.request('admin','PUT',`/audit-actions/${action.data.data._id}/status`,{status:'completed',evidenceIds:[docs[0]]});assert.equal(completed.status,200);assert.deepEqual(completed.data.data.evidenceIds,[docs[0]]);
  assert.equal((await h.request('admin','POST',`/audit-score/${auditId}/calculate`,{})).status,409);
  assert.equal((await h.request('admin','PUT',`/audit-execution/${id}/service-draft`,{...payload,expectedVersion:2})).status,409);
  await assert.rejects(()=>require('../models/serviceAuditSave.model').updateOne({executionId:id},{$set:{actor:'forged'}}));
 }}finally{for(const file of owned)await storage.forReference(file.storageReference,String(file.auditId)).remove(file.storageReference);}
}));
