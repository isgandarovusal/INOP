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
 const Restaurant=require('../models/restaurant.model'),XLSX=require('./helpers/spreadsheet.cjs');
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
   const workbook=await XLSX.read(exported.buffer,{type:'buffer'});
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

test('KFC reviewed v2 coexists with immutable v1 revisions and safely preserves legacy drafts/results',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Template=require('../models/auditTemplate.model'),Revision=require('../models/auditTemplateRevision.model'),Binding=require('../models/serviceAuditSourceBinding.model');
 const Restaurant=require('../models/restaurant.model'),Execution=require('../models/auditExecution.model');
 const content=hr.contentFor('kfc','service-source-v1'),templateId=new h.mongoose.Types.ObjectId(),revisionId=new h.mongoose.Types.ObjectId();
 await Template.create({...content,_id:templateId,status:'active',revisionCounter:1,publishedRevisionId:revisionId,createdBy:String(h.actors.admin._id)});
 await Revision.create({_id:revisionId,templateId,revision:1,content,publishedBy:String(h.actors.admin._id),publishedAt:new Date()});
 const original=require('../config/serviceAuditSources.json').find(s=>s.brandId==='kfc');await Binding.create({_id:hr.bindingKey(original),templateId,revisionId});
 await Restaurant.create({id:'legacy-kfc',name:'Synthetic legacy KFC',organizationId:'gfc',brandId:'kfc'});
 const create=()=>require('../services/auditCreation.service').createAuditWithDepartmentSnapshot({id:require('node:crypto').randomUUID(),auditType:'service',restaurantId:'legacy-kfc',date:'2026-10-15',templateId:String(templateId)},{id:String(h.actors.admin._id),role:'admin',departmentId:'dep_A'});
 const parent=await create();const started=await h.request('admin','POST','/audit-execution',{auditId:String(parent._id)});assert.equal(started.status,201);const id=started.data.data._id;
 const answers=content.sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'1'})));
 const draft=await h.request('admin','PUT',`/audit-execution/${id}/service-draft`,{answers,expectedVersion:0,details:{observations:'Preserved legacy draft'}});assert.equal(draft.status,200,JSON.stringify(draft.data));
 assert.equal(draft.data.data.overallPercentage,null);assert.equal(draft.data.data.answers.find(a=>a.questionId===hr.NEGATIVE_CRITERION).score,null);assert.equal(draft.data.data.answers.find(a=>a.questionId===hr.NEGATIVE_CRITERION).answer,'1');
 const historyBefore=await h.request('admin','GET',`/audit-execution/${id}/service-history`);
 const blocked=await h.request('admin','PUT',`/audit-execution/${id}/submit`,{answers,expectedVersion:1,details:{}});assert.equal(blocked.status,422);
 assert.deepEqual((await h.request('admin','GET',`/audit-execution/${id}/service-history`)).data,historyBefore.data);
 assert.equal((await h.request('admin','PATCH',`/audit-workflow/${parent._id}/status`,{status:'completed'})).status,409);
 // An old audit with a genuinely inapplicable B67 remains completable: do not blanket-block v1.
 const safeParent=await create();const safeStart=await h.request('admin','POST','/audit-execution',{auditId:String(safeParent._id)});assert.equal(safeStart.status,201);
 const safeAnswers=answers.map(a=>({...a,answer:a.questionId===hr.NEGATIVE_CRITERION?'na':'0.5'}));
 const safeSave=await h.request('admin','PUT',`/audit-execution/${safeStart.data.data._id}/submit`,{answers:safeAnswers,expectedVersion:0,details:{}});assert.equal(safeSave.status,200,JSON.stringify(safeSave.data));assert.equal(safeSave.data.data.overallPercentage,50);assert.equal(safeSave.data.data.serviceAssessment.applicable,93);
 // Model-only fixture represents an already completed historical result, not a new API submission.
 const historicalParent=await create();historicalParent.status='in-progress';historicalParent.checks=answers;historicalParent.overallPercentage=100;historicalParent.assessmentStatus='scored';await historicalParent.save();const historical=await Execution.create({auditId:historicalParent._id,templateRevisionId:revisionId,templateSnapshot:content,status:'completed',answers:answers.map(a=>({...a,score:1})),overallPercentage:100,assessmentStatus:'scored',serviceAssessment:{complete:true,contract:content.serviceSource.scoringStatus,sections:[]}});
 const originalResult=await Execution.findById(historical._id).lean();
 const provision=await h.request('admin','POST','/audit-service/templates/kfc',{});assert.equal(provision.status,201,JSON.stringify(provision.data));assert.notEqual(String(provision.data.data.templateId),String(templateId));
 assert.equal((await Binding.findById(hr.bindingKey(original))).revisionId.toString(),revisionId.toString());assert.deepEqual((await Revision.findById(revisionId).lean()).content,content);
 const fresh=await h.request('admin','POST','/audit-service/audits',{brandId:'kfc',restaurantId:'legacy-kfc',date:'2026-10-15'});assert.equal(fresh.status,201);assert.equal(fresh.data.data.templateSnapshot.serviceSource.version,'service-source-v2');
 const stats=await h.request('admin','GET','/audit-service/analytics?brandId=kfc');assert.equal(stats.status,200,JSON.stringify(stats.data));assert.equal(stats.data.data.average,75);assert.equal(stats.data.data.legacyConformityExclusions,1);assert.ok(!stats.data.data.criteria.some(q=>q.id===hr.NEGATIVE_CRITERION));
 assert.deepEqual(await Execution.findById(historical._id).lean(),originalResult);
 const read=await h.request('admin','GET',`/audit-execution/${historical._id}`);assert.equal(read.status,200);assert.equal(read.data.data.overallPercentage,100);
 const historicalReport=await h.request('admin','GET',`/audit-report/${historicalParent._id}`);assert.equal(historicalReport.status,200);assert.equal(historicalReport.data.data.score,100);
 const historicalExport=await h.request('admin','GET',`/audit-export/${historicalParent._id}/excel`);assert.equal(historicalExport.status,200);
 const XLSX=require('./helpers/spreadsheet.cjs'),workbook=await XLSX.read(historicalExport.buffer,{type:'buffer'});assert.equal(XLSX.utils.sheet_to_json(workbook.Sheets['Service Source'])[0].OverallPercentage,100);
 // Existing independent review/closure is not gated by the new questionnaire version.
 const reviewer=await h.models.User.create({name:'Historical Reviewer',email:'historical-reviewer@example.invalid',password:'synthetic',role:'admin',departmentId:'dep_A',isActive:true});
 h.tokens.reviewer=require('jsonwebtoken').sign({id:String(reviewer._id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
 const transition=await h.request('admin','PATCH',`/audit-workflow/${historicalParent._id}/status`,{status:'completed'});assert.equal(transition.status,200,JSON.stringify(transition.data));assert.equal((await h.models.Audit.findById(historicalParent._id)).overallPercentage,100);
 const approval=await h.request('admin','POST','/audit-approval',{auditId:String(historicalParent._id),reviewer:String(reviewer._id)});assert.equal(approval.status,201,JSON.stringify(approval.data));
 const approvalId=approval.data.data?._id||approval.data._id;
 assert.equal((await h.request('reviewer','PATCH',`/audit-approval/${approvalId}`,{status:'approved'})).status,200);
 assert.equal((await h.request('admin','POST','/audit-closure',{auditId:String(historicalParent._id)})).status,201);
 assert.deepEqual(await Execution.findById(historical._id).lean(),originalResult);
 assert.equal((await h.request('admin','PUT',`/audit-execution/${historical._id}/service-draft`,{answers,expectedVersion:0,details:{}})).status,409);
}));
