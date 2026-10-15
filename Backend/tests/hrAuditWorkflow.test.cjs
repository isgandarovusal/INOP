const {test}=require('node:test');const assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');const hr=require('../services/hrAuditAssessment.service');
test('HR source provisioning, draft concurrency, evidence isolation, scoring, analytics, permissions and immutable closure',{timeout:90000},async()=>withAuditFixture(async h=>{
 const {actors,models}=h;const Profile=require('../models/auditorProfile.model');const Restaurant=require('../models/restaurant.model');
 await models.Role.updateMany({key:{$in:['test_own','test_assigned','test_department']}},{$push:{permissions:{$each:[{resource:'audit.execution',action:'*',scope:'own'},{resource:'audit.action',action:'*',scope:'own'}]}}});
 await Restaurant.create({id:'ph',name:'Synthetic PH',organizationId:'gfc',brandId:'pizza-hut'});
 await Restaurant.create({id:'ss',name:'Synthetic SS',organizationId:'gfc',brandId:'simit-sarayi'});
 const call=(actor,m,path,body)=>h.request(actor,m,path,body);
 assert.equal((await call('anonymous','GET','/audit-hr/sources')).status,401);
 assert.equal((await call('hr','GET','/audit-hr/sources')).status,403);
 assert.equal((await call('auditor','GET','/audit-hr/sources')).status,403);
 const p=await call('admin','POST','/audit-hr/templates/pizza-hut',{});assert.equal(p.status,201,JSON.stringify(p.data));
 const p2=await call('admin','POST','/audit-hr/templates/pizza-hut',{});assert.equal(String(p2.data.data.templateId),String(p.data.data.templateId));
 const created=await call('admin','POST','/audit-hr/audits',{brandId:'pizza-hut',restaurantId:'ph',date:'2026-10-15'});assert.equal(created.status,201,JSON.stringify(created.data));const audit=created.data.data;
 const directory=await call('admin','GET',`/audit-hr/${audit._id}/action-people?q=%2E%2A`);assert.equal(directory.status,200);assert.deepEqual(directory.data.data,[]);
 assert.equal((await call('admin','POST','/audit-hr/audits',{brandId:'pizza-hut',restaurantId:'ss',date:'2026-10-15'})).status,403);
 const e=await call('admin','POST','/audit-execution',{auditId:audit._id});assert.equal(e.status,201,JSON.stringify(e.data));const execution=e.data.data;
 const q=hr.contentFor('pizza-hut').sections.flatMap(s=>s.questions),answers=q.map((q,i)=>({questionId:q.id,answer:i===0?'0.5':'na',score:999,comment:'synthetic note'}));
 const body={answers:answers.slice(0,1),expectedVersion:0,details:{observations:'synthetic observation',sectionNotes:{'pizza-hut-s7':'synthetic section'}}};
 const draft=await call('admin','PUT',`/audit-execution/${execution._id}/draft`,body);assert.equal(draft.status,200,JSON.stringify(draft.data));assert.equal(draft.data.data.hrVersion,1);assert.equal(draft.data.data.answers[0].score,0.5);
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/draft`,body)).status,409);
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/submit`,{...body,expectedVersion:1})).status,422);
 const foreign=await h.audit('foreign','hr');const evidence=await require('../models/auditEvidence.model').create({auditId:foreign._id,storageKey:'synthetic',name:'synthetic',size:1,mimeType:'text/plain',uploadedBy:String(actors.foreign._id)});
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/draft`,{...body,expectedVersion:1,evidenceLinks:[{questionId:q[0].id,evidenceId:String(evidence._id)}]})).status,400);
 const submitted=await call('admin','PUT',`/audit-execution/${execution._id}/submit`,{answers,expectedVersion:1,details:body.details});assert.equal(submitted.status,200,JSON.stringify(submitted.data));assert.equal(submitted.data.data.overallPercentage,50);
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/draft`,{...body,expectedVersion:2})).status,409);
 const history=await call('admin','GET',`/audit-execution/${execution._id}/hr-history`);assert.equal(history.data.data.length,2);assert.equal(history.data.data[1].details.observations,'synthetic observation');
 assert.equal((await call('foreign','GET',`/audit-execution/${execution._id}`)).status,403);
 const analytics=await call('admin','GET','/audit-hr/analytics?brandId=pizza-hut');assert.equal(analytics.status,200,JSON.stringify(analytics.data));assert.equal(analytics.data.data.average,50);assert.equal(analytics.data.data.criteria.find(c=>c.id===q[0].id).average,50);assert.equal(analytics.data.data.submitted,1);
 assert.equal((await call('admin','GET','/audit-hr/analytics?direction=service')).status,400);
 await Profile.updateOne({_id:actors.auditor._id},{$set:{direction:'hr'}});await h.assign('auditor',await models.Audit.findById(audit._id));
 assert.equal((await call('auditor','GET','/audit-hr/list')).status,200);
 const options=await call('auditor','GET','/audit-hr/options');assert.deepEqual(options.data.data.map(r=>r.id),['ph']);
 const isolated=await call('auditor','GET','/audit-hr/analytics');assert.equal(isolated.status,200);assert.equal(isolated.data.data.total,1);assert.equal((await call('auditor','GET',`/audit-execution/${execution._id}`)).status,200);
 await h.models.Assignment.updateMany({auditId:audit._id,auditor:actors.auditor._id},{$set:{status:'revoked'}});assert.equal((await call('auditor','GET',`/audit-execution/${execution._id}`)).status,403);assert.equal((await call('auditor','GET','/audit-hr/analytics')).data.data.total,0);
 await Profile.updateOne({_id:actors.auditor._id},{$set:{direction:'service'}});assert.equal((await call('auditor','GET','/audit-hr/list')).status,403);
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
 assert.equal((await call('admin','PUT',`/audit-execution/${execution._id}/draft`,{...body,expectedVersion:2})).status,409);
 await assert.rejects(()=>require('../models/hrAuditSave.model').updateOne({executionId:execution._id},{$set:{actor:'forged'}}));
}));
test('Simit Sarayı and KFC: safe template coexistence, concurrent drafts, evidence link, no legacy rescore',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Template=require('../models/auditTemplate.model'),Restaurant=require('../models/restaurant.model');
 const legacy=await h.audit('admin','hr',{overallPercentage:72,assessmentStatus:'scored'});
 const custom=await Template.create({organizationId:'gfc',brandId:'simit-sarayi',brandName:'Simit Sarayı',auditType:'hr',name:'Existing custom template',sections:[],status:'draft'});
 for(const brand of ['simit-sarayi','kfc']){
  assert.equal((await h.request('admin','POST',`/audit-hr/templates/${brand}`,{})).status,201);
  const restaurantId=`hr-${brand}`;await Restaurant.create({id:restaurantId,name:'Synthetic source restaurant',organizationId:'gfc',brandId:brand});
  const created=await h.request('admin','POST','/audit-hr/audits',{brandId:brand,restaurantId,date:'2026-10-15'});assert.equal(created.status,201);const audit=created.data.data;
  const e=await h.request('admin','POST','/audit-execution',{auditId:audit._id});assert.equal(e.status,201);const id=e.data.data._id;
  const answers=hr.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'1'})));
  const own=await require('../models/auditEvidence.model').create({auditId:audit._id,storageKey:'synthetic',name:'synthetic',size:1,mimeType:'text/plain',uploadedBy:String(h.actors.admin._id)});
  const payload={answers,expectedVersion:0,details:{finalOpinion:'Synthetic final opinion'},evidenceLinks:[{questionId:answers[0].questionId,evidenceId:String(own._id)}]};
  const saves=await Promise.all([h.request('admin','PUT',`/audit-execution/${id}/draft`,payload),h.request('admin','PUT',`/audit-execution/${id}/draft`,payload)]);assert.deepEqual(saves.map(r=>r.status).sort(),[200,409]);
  assert.equal((await h.request('admin','PATCH',`/audit-workflow/${audit._id}/status`,{status:'completed'})).status,409);
  const completed=await h.request('admin','PUT',`/audit-execution/${id}/submit`,{...payload,expectedVersion:1});assert.equal(completed.status,200,JSON.stringify(completed.data));assert.equal(completed.data.data.overallPercentage,brand==='kfc'?null:100);assert.equal(completed.data.data.hrDetails.evidenceLinks[0].evidenceId,String(own._id));assert.equal(completed.data.data.answers[0].score,brand==='kfc'?null:1);
  const exported=await h.request('admin','GET',`/audit-export/${audit._id}/excel`);assert.equal(exported.status,200);
  const XLSX=require('xlsx'),workbook=XLSX.read(exported.buffer,{type:'buffer'});assert.ok(workbook.SheetNames.includes('HR Criteria'));const rows=XLSX.utils.sheet_to_json(workbook.Sheets['HR Criteria']);assert.equal(rows.length,answers.length);assert.equal(rows[0].SourceCell,hr.contentFor(brand).sections[0].questions[0].sourceCell);
  const report=await h.request('admin','GET',`/audit-report/${audit._id}`);assert.equal(report.status,200);assert.equal(report.data.data.score,brand==='kfc'?null:100);
  assert.equal((await h.request('admin','POST',`/audit-score/${audit._id}/calculate`,{})).status,409);

 }
 assert.equal((await Template.findById(custom._id)).name,'Existing custom template');assert.equal((await h.models.Audit.findById(legacy._id)).overallPercentage,72);
 const stats=await h.request('admin','GET','/audit-hr/analytics');assert.equal(stats.status,200);assert.equal(stats.data.data.scored,1);assert.equal(stats.data.data.unscored,1);assert.equal(stats.data.data.average,100);
}));

test('HR N/A persists neutrally through submission, analytics, report, Excel and history',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Restaurant=require('../models/restaurant.model'),XLSX=require('xlsx');
 for(const brand of ['pizza-hut','simit-sarayi']){
  assert.equal((await h.request('admin','POST',`/audit-hr/templates/${brand}`,{})).status,201);
  const restaurantId=`na-${brand}`;await Restaurant.create({id:restaurantId,name:'Synthetic N/A restaurant',organizationId:'gfc',brandId:brand});
  for(const mixed of [false,true]){
   const created=await h.request('admin','POST','/audit-hr/audits',{brandId:brand,restaurantId,date:'2026-10-15'});assert.equal(created.status,201);
   const auditId=created.data.data._id;
   const execution=await h.request('admin','POST','/audit-execution',{auditId});assert.equal(execution.status,201);
   const answers=hr.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'na',score:1})));
   if(mixed) ['0','0.5','1'].forEach((answer,i)=>{answers[i].answer=answer;});
   const response=await h.request('admin','PUT',`/audit-execution/${execution.data.data._id}/submit`,{answers,expectedVersion:0,details:{}});
   assert.equal(response.status,200,JSON.stringify(response.data));const saved=response.data.data;
   assert.equal(saved.overallPercentage,mixed?50:null);assert.equal(saved.assessmentStatus,mixed?'scored':'unscored');
   assert.equal(saved.hrAssessment.applicable,mixed?3:0);assert.equal(saved.hrAssessment.earned,mixed?1.5:0);
   assert.equal(saved.hrAssessment.na,answers.length-(mixed?3:0));
   assert.ok(saved.answers.filter(a=>a.answer==='na').every(a=>a.score===null));
   const parent=await h.models.Audit.findById(auditId).lean();assert.equal(parent.overallPercentage,mixed?50:null);
   assert.equal(parent.checks.filter(a=>a.answer==='na').length,answers.length-(mixed?3:0));
   assert.equal(await h.models.Finding.countDocuments({auditId}),0);
   const history=await h.request('admin','GET',`/audit-execution/${saved._id}/hr-history`);
   assert.equal(history.status,200);assert.equal(history.data.data[0].answers.filter(a=>a.answer==='na').length,answers.length-(mixed?3:0));
   const report=await h.request('admin','GET',`/audit-report/${auditId}`);assert.equal(report.status,200);assert.equal(report.data.data.score,mixed?50:null);
   const exported=await h.request('admin','GET',`/audit-export/${auditId}/excel`);assert.equal(exported.status,200);
   const workbook=XLSX.read(exported.buffer,{type:'buffer'});
   const rows=XLSX.utils.sheet_to_json(workbook.Sheets['HR Criteria']);assert.equal(rows.filter(r=>r.Answer==='na').length,answers.length-(mixed?3:0));
   const source=XLSX.utils.sheet_to_json(workbook.Sheets['HR Source'])[0];assert.equal(source.OverallPercentage,mixed?50:'');
   const stats=await h.request('admin','GET',`/audit-hr/analytics?brandId=${brand}`);assert.equal(stats.status,200);const data=stats.data.data;
   assert.equal(data.average,mixed?50:null);assert.equal(data.scored,mixed?1:0);assert.equal(data.unscored,1);
   assert.equal(data.nonconformities,mixed?2:0);
   assert.ok(data.criteria.filter(c=>!mixed||!answers.slice(0,3).some(a=>a.questionId===c.id)).every(c=>c.average===null&&c.nonconformities===0));
  }
 }
}));
