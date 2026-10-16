const{test}=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');const standard=require('../services/standardAuditAssessment.service');
test('Three Standard catalogues: complete draft, source results, N/A, findings, analytics, export and immutable history',{timeout:120000},async()=>withAuditFixture(async h=>{
 const Restaurant=require('../models/restaurant.model'),XLSX=require('xlsx');
 for(const source of standard.sources){
  const p=await h.request('admin','POST',`/audit-standard/templates/${source.brandId}`,{});assert.equal(p.status,201,JSON.stringify(p.data));const p2=await h.request('admin','POST',`/audit-standard/templates/${source.brandId}`,{});assert.equal(p2.status,201,JSON.stringify(p2.data));assert.equal(p2.data.data.templateId,String(p.data.data.templateId));
  const restaurantId=`std-${source.brandId}`;await Restaurant.create({id:restaurantId,name:`Synthetic ${source.brandName}`,brandId:source.brandId,organizationId:'gfc',location:'Synthetic Area'});
  for(const allNA of [true,false]){
   const create=await h.request('admin','POST','/audit-standard/audits',{brandId:source.brandId,restaurantId,date:'2026-10-16'});assert.equal(create.status,201,JSON.stringify(create.data));const parent=create.data.data;
   const start=await h.request('admin','POST','/audit-execution',{auditId:parent._id});assert.equal(start.status,201,JSON.stringify(start.data));const e=start.data.data;assert.equal(e.standardAssessment.total,source.sections.flatMap(s=>s.questions).length);
   const answers=source.sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'na',comment:'Synthetic criterion note '.repeat(8),score:999})));
   const naReasons=Object.fromEntries(answers.map(a=>[a.questionId,'Synthetic object not available in this restaurant']));
   if(!allNA)['compliant','critical','major','minor'].forEach((answer,i)=>answers[i].answer=answer);
   const details={naReasons,observations:'Synthetic overall observations',finalOpinion:'Synthetic opinion',sectionNotes:{[source.sections[0].id]:'Synthetic section note'},criterionObservations:allNA?[]:[{id:'obs-one',standardId:answers[1].questionId,description:'Synthetic first observation',evidenceIds:[]},{id:'obs-two',standardId:answers[1].questionId,description:'Synthetic second observation',evidenceIds:[]}]};
   const draft=await h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,{answers:answers.slice(0,1),expectedVersion:0,details});assert.equal(draft.status,200,JSON.stringify(draft.data));assert.equal(draft.data.data.standardVersion,1);
   assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/submit`,{answers:answers.slice(0,1),expectedVersion:1,details})).status,422);
   assert.equal((await h.request('admin','GET',`/audit-export/${parent._id}/excel`)).status,409);
   const payload={answers,expectedVersion:1,details};const submit=await h.request('admin','PUT',`/audit-execution/${e._id}/submit`,payload);assert.equal(submit.status,200,JSON.stringify(submit.data));assert.equal(submit.data.data.overallPercentage,allNA?null:25);assert.ok(submit.data.data.answers.every(a=>a.score===null));
   assert.equal((await h.request('admin','PUT',`/audits/${parent._id}`,{date:'2030-01-01'})).status,409);
   assert.equal((await h.request('admin','POST','/audit-findings',{auditId:parent._id,title:'Injected finding',standardId:answers[0].questionId,severity:'critical'})).status,409);
   const findings=await h.models.Finding.find({auditId:parent._id}).lean();assert.equal(findings.length,allNA?0:4);assert.equal(new Set(findings.map(f=>f.code)).size,findings.length);assert.ok(findings.every(f=>f.standardId&&f.catalogVersion===source.version));
   const report=await h.request('admin','GET',`/audit-report/${parent._id}`);assert.equal(report.status,200);assert.equal(report.data.data.score,allNA?null:25);assert.equal(report.data.data.standard.assessment.na,answers.length-(allNA?0:4));
   const exportFile=await h.request('admin','GET',`/audit-export/${parent._id}/excel`);assert.equal(exportFile.status,200,JSON.stringify(exportFile.data));const book=XLSX.read(exportFile.buffer,{type:'buffer'});for(const name of ['Cover','Findings','Standards','Actions','Approvals','Closures','History'])assert.ok(book.Sheets[name],name);
   const cover=XLSX.utils.sheet_to_json(book.Sheets.Cover)[0];assert.equal(cover.Total,answers.length);assert.equal(cover.Percentage,allNA?'':25);assert.equal(cover.NA,answers.length-(allNA?0:4));assert.equal(XLSX.utils.sheet_to_json(book.Sheets.Standards).length,answers.length);
   const history=await h.request('admin','GET',`/audit-execution/${e._id}/standard-history`);assert.equal(history.data.data.length,2);assert.equal(history.data.data[0].details.observations,details.observations);
   assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,{...payload,expectedVersion:2})).status,409);assert.equal((await h.request('admin','POST',`/audit-score/${parent._id}/calculate`,{})).status,409);
   const analytics=await h.request('admin','GET',`/audit-standard/analytics?brandId=${source.brandId}&area=Synthetic%20Area&catalogVersion=${source.version}`);assert.equal(analytics.status,200,JSON.stringify(analytics.data));assert.equal(analytics.data.data.counts.percentage,allNA?null:25);assert.equal(analytics.data.data.counts.critical,allNA?0:1);
   if(!allNA){
    const base=`/audit-standard/analytics?brandId=${source.brandId}`;
    const section=(await h.request('admin','GET',base+`&sectionId=${source.sections[0].id}`)).data.data;assert.equal(section.counts.percentage,25);assert.equal(section.counts.total,source.sections[0].questions.length*2);
    const onlyNa=(await h.request('admin','GET',base+'&result=na')).data.data;assert.equal(onlyNa.counts.applicable,0);assert.equal(onlyNa.counts.percentage,null);
    const wrongAuditor=(await h.request('admin','GET',base+`&auditorId=${h.actors.foreign._id}`)).data.data;assert.equal(wrongAuditor.total,0);
    assert.equal((await h.request('admin','GET',base+'&status=completed')).data.data.total,0);
    assert.equal((await h.request('admin','GET',base+'&dateFrom=2027-01-01')).data.data.total,0);
    const category=(await h.request('admin','GET',base+'&category='+encodeURIComponent(source.sections[0].category))).data.data;assert.equal(category.counts.percentage,25);
    if(source.brandId==='simit-sarayi'){const risk=(await h.request('admin','GET',base+'&risk=critical')).data.data;assert.equal(risk.counts.critical,0);assert.equal(risk.counts.percentage,100);}
   }
  }
 }
}));

test('Standard applicability requires independent review, immutable revision and approved closure',{timeout:90000},async()=>withAuditFixture(async h=>{
 const brand='simit-sarayi',Restaurant=require('../models/restaurant.model');await Restaurant.create({id:'na-review',name:'Synthetic review restaurant',organizationId:'gfc',brandId:brand});
 await h.request('admin','POST',`/audit-standard/templates/${brand}`,{});const created=await h.request('admin','POST','/audit-standard/audits',{brandId:brand,restaurantId:'na-review',date:'2026-10-16'});assert.equal(created.status,201);
 const auditId=created.data.data._id;const started=await h.request('admin','POST','/audit-execution',{auditId});const e=started.data.data;
 const answers=standard.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'na'}))),naReasons=Object.fromEntries(answers.map(a=>[a.questionId,'Synthetic objective absence']));
 assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/submit`,{answers,expectedVersion:0,details:{}})).status,422);
 assert.equal((await h.request('admin','PATCH',`/audit-workflow/${auditId}/status`,{status:'completed'})).status,409);
 assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/submit`,{answers,expectedVersion:0,details:{naReasons}})).status,200);
 const reviewer=await h.models.User.create({name:'Independent standard reviewer',email:'std-review@example.invalid',password:'synthetic',role:'admin',isActive:true});h.tokens.reviewer=require('jsonwebtoken').sign({id:String(reviewer._id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
 const request=await h.request('admin','POST','/audit-approval',{auditId,reviewer:String(reviewer._id)});assert.equal(request.status,201,JSON.stringify(request.data));const approvalId=request.data.data?._id||request.data._id;
 assert.equal((await h.request('admin','PATCH',`/audit-approval/${approvalId}`,{status:'approved',naConfirmed:true})).status,403);
 assert.equal((await h.request('reviewer','PATCH',`/audit-approval/${approvalId}`,{status:'approved'})).status,422);
 const reviewed=await h.request('reviewer','PATCH',`/audit-approval/${approvalId}`,{status:'approved',naConfirmed:true});assert.equal(reviewed.status,200,JSON.stringify(reviewed.data));assert.equal(reviewed.data.data.applicabilityReview.na.length,71);
 const closed=await h.request('admin','POST','/audit-closure',{auditId});assert.equal(closed.status,201,JSON.stringify(closed.data));
 const history=await h.request('admin','GET',`/audit-execution/${e._id}/standard-history`);assert.equal(history.data.data[0].assessment.overallPercentage,null);assert.equal(history.data.data[0].details.naReasons[answers[0].questionId],naReasons[answers[0].questionId]);
 await assert.rejects(()=>require('../models/standardAuditSave.model').updateOne({auditId},{$set:{actor:'forged'}}));await assert.rejects(()=>require('../models/auditTemplateRevision.model').updateOne({_id:e.templateRevisionId},{$set:{content:{}}}));
 assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,{answers,expectedVersion:1,details:{naReasons}})).status,409);
}));

test('Standard real photo/documents, concurrent drafts, multiple observations and corrective-action proof are isolated',{timeout:120000},async()=>withAuditFixture(async h=>{
 const Restaurant=require('../models/restaurant.model'),Evidence=require('../models/auditEvidence.model'),storage=require('../services/auditEvidenceStorage.service'),owned=[];
 try{for(const source of standard.sources){
  const restaurantId=`files-${source.brandId}`;await Restaurant.create({id:restaurantId,name:'Synthetic proof restaurant',organizationId:'gfc',brandId:source.brandId});await h.request('admin','POST',`/audit-standard/templates/${source.brandId}`,{});
  const parent=(await h.request('admin','POST','/audit-standard/audits',{brandId:source.brandId,restaurantId,date:'2026-10-16'})).data.data;const e=(await h.request('admin','POST','/audit-execution',{auditId:parent._id})).data.data;
  const upload=async(bytes,mime,name)=>{const form=new FormData();form.append('file',new Blob([bytes],{type:mime}),name);const res=await fetch(h.apiBase+`/audit-evidence/${parent._id}`,{method:'POST',headers:{Authorization:`Bearer ${h.tokens.admin}`},body:form});assert.equal(res.status,201);const body=await res.json();const row=await Evidence.findById(body.data.id).lean();owned.push(row);assert.deepEqual((await h.request('admin','GET',`/audit-evidence/${row._id}/file`)).buffer,bytes);return String(row._id);};
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),photo=await upload(png,'image/png','synthetic.png'),docs=[];for(let i=0;i<3;i++)docs.push(await upload(Buffer.from(`Synthetic ${i}`),'text/plain',`document-${i}.txt`));
  const snapshot=standard.contentFor(source.brandId),answers=snapshot.sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'na',comment:'Synthetic observation'}))),naReasons=Object.fromEntries(answers.map(a=>[a.questionId,'Synthetic objective absence']));answers[0].answer='compliant';answers[1].answer='critical';
  const details={naReasons,sectionPhotos:{[snapshot.sections[0].id]:photo},sectionNotes:{[snapshot.sections[0].id]:'Synthetic section'},finalEvidence:{photoId:photo,documentIds:docs},criterionObservations:[{id:'first',standardId:answers[1].questionId,description:'Synthetic first problem',evidenceIds:[photo]},{id:'second',standardId:answers[1].questionId,description:'Synthetic second problem',evidenceIds:[docs[0]]}]};
  const body={answers,expectedVersion:0,details,evidenceLinks:[{questionId:answers[1].questionId,evidenceId:photo}]};const concurrent=await Promise.all([h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,body),h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,body)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);body.expectedVersion=1;
  const foreign=await h.audit('foreign','standard');const foreignFile=await Evidence.create({auditId:foreign._id,storageKey:'synthetic',name:'foreign.png',mimeType:'image/png',size:1,uploadedBy:String(h.actors.foreign._id)});
  assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,{...body,details:{...details,sectionPhotos:{[snapshot.sections[0].id]:String(foreignFile._id)}}})).status,400);
  assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,{...body,details:{...details,criterionObservations:[{...details.criterionObservations[0],evidenceIds:[String(foreignFile._id)]}]}})).status,400);
  assert.equal((await h.request('admin','PUT',`/audit-execution/${e._id}/standard-draft`,{...body,details:{...details,finalEvidence:{photoId:photo,documentIds:[...docs,photo]}}})).status,400);
  const submitted=await h.request('admin','PUT',`/audit-execution/${e._id}/submit`,body);assert.equal(submitted.status,200,JSON.stringify(submitted.data));assert.equal(submitted.data.data.overallPercentage,50);assert.equal(submitted.data.data.standardAssessment.critical,1);assert.equal(submitted.data.data.passed,null);
  const findings=await h.models.Finding.find({auditId:parent._id}).lean();assert.equal(findings.length,2);assert.ok(findings.every(f=>f.severity==='critical'&&f.standardId===answers[1].questionId));
  const action=await h.request('admin','POST','/audit-actions',{auditId:parent._id,title:'Synthetic correction',responsible:String(h.actors.admin._id),findingId:String(findings[0]._id)});assert.equal(action.status,201,JSON.stringify(action.data));assert.ok(!action.data.data.dueDate,'No unapproved automatic 48h/7d deadline');
  assert.equal((await h.request('admin','PUT',`/audit-actions/${action.data.data._id}/status`,{status:'completed',evidenceIds:[String(foreignFile._id)]})).status,400);
  assert.equal((await h.request('admin','PUT',`/audit-actions/${action.data.data._id}/status`,{status:'completed',evidenceIds:[docs[0]]})).status,200);
  assert.equal((await h.request('admin','PUT',`/audit-actions/${action.data.data._id}/status`,{status:'verified'})).status,403);
  const reviewer=await h.models.User.create({name:'Synthetic proof reviewer',email:`proof-${source.brandId}@example.invalid`,password:'synthetic',role:'admin',isActive:true});h.tokens.reviewer=require('jsonwebtoken').sign({id:String(reviewer._id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
  assert.equal((await h.request('reviewer','PUT',`/audit-actions/${action.data.data._id}/status`,{status:'verified',verificationNote:'Synthetic independent verification'})).status,200);
  const stats=await h.request('admin','GET',`/audit-standard/analytics?brandId=${source.brandId}`);assert.equal(stats.status,200);assert.equal(stats.data.data.counts.critical,1);assert.ok(stats.data.data.actions.some(a=>a._id.status==='verified'&&a.responsibleName==='admin'));
  for(const finding of findings)assert.equal((await h.request('admin','PATCH',`/audit-findings/${finding._id}/status`,{status:'closed'})).status,200);
  const approval=await h.request('admin','POST','/audit-approval',{auditId:parent._id,reviewer:String(reviewer._id)});assert.equal(approval.status,201);const approvalId=approval.data.data?._id||approval.data._id;assert.equal((await h.request('reviewer','PATCH',`/audit-approval/${approvalId}`,{status:'approved',naConfirmed:true})).status,200);assert.equal((await h.request('admin','POST','/audit-closure',{auditId:parent._id})).status,201);
  const history=await h.request('admin','GET',`/audit-execution/${e._id}/standard-history`);assert.deepEqual(history.data.data[0].details.finalEvidence,details.finalEvidence);assert.deepEqual(history.data.data[0].details.criterionObservations,details.criterionObservations);
 }}finally{for(const row of owned)await storage.forReference(row.storageReference,String(row.auditId)).remove(row.storageReference);}
}));

test('An assigned Standard auditor creates only their full brand catalogue and cannot select a partial revision',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Profile=require('../models/auditorProfile.model'),Restaurant=require('../models/restaurant.model'),Template=require('../models/auditTemplate.model'),Revision=require('../models/auditTemplateRevision.model');await Profile.updateOne({_id:h.actors.auditor._id},{$set:{direction:'standard'}});
 for(const brand of standard.sources)assert.equal((await h.request('admin','POST',`/audit-standard/templates/${brand.brandId}`,{})).status,201);
 const granted=await h.audit('admin','standard',{restaurantId:'restaurant-admin'});await h.assign('auditor',granted);
 const created=await h.request('auditor','POST','/audit-standard/audits',{brandId:'kfc',restaurantId:'restaurant-admin',date:'2026-10-16'});assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(created.data.data.templateSnapshot.sections.flatMap(s=>s.questions).length,190);
 await Restaurant.create({id:'foreign-ph',name:'Synthetic PH',organizationId:'gfc',brandId:'pizza-hut'});assert.equal((await h.request('auditor','POST','/audit-standard/audits',{brandId:'pizza-hut',restaurantId:'foreign-ph',date:'2026-10-16'})).status,403);
 const content=standard.contentFor('kfc');content.sections[0].questions.pop();const templateId=new h.mongoose.Types.ObjectId(),revisionId=new h.mongoose.Types.ObjectId();await Template.create({...content,_id:templateId,status:'active',publishedRevisionId:revisionId});await Revision.create({_id:revisionId,templateId,revision:1,content,publishedBy:String(h.actors.admin._id),publishedAt:new Date()});
 const partial=await h.request('auditor','POST','/audits',{id:require('node:crypto').randomUUID(),auditType:'standard',restaurantId:'restaurant-admin',date:'2026-10-16',templateId:String(templateId)});assert.equal(partial.status,409);
 const row=await h.request('auditor','POST','/audit-execution',{auditId:created.data.data._id});assert.equal(row.status,201);assert.equal(row.data.data.templateSnapshot.sections.flatMap(s=>s.questions).length,190);
}));

test('Standard analytics includes more than 500 audits without silently truncating counts',{timeout:90000},async()=>withAuditFixture(async h=>{
 await h.models.Audit.insertMany(Array.from({length:501},(_,i)=>({id:`synthetic-window-${i}`,restaurantId:'restaurant-admin',auditorId:String(h.actors.admin._id),auditType:'standard',date:'2026-10-16',status:'draft',templateSnapshot:{brandId:'kfc',standardSource:{version:'synthetic-window-only'}}})));
 const response=await h.request('admin','GET','/audit-standard/analytics');assert.equal(response.status,200);assert.equal(response.data.data.total,501);assert.equal(response.data.data.completed,0);assert.equal(response.data.data.completeRange,true);
 assert.equal((await h.request('admin','GET','/audit-standard/analytics?dateFrom=2027-01-01')).status,200);
}));

test('A scheduled audit records the actual submitting auditor and forbids contributor self-review',{timeout:90000},async()=>withAuditFixture(async h=>{
 const Profile=require('../models/auditorProfile.model');await Profile.updateOne({_id:h.actors.auditor._id},{$set:{direction:'standard'}});await h.request('admin','POST','/audit-standard/templates/kfc',{});
 const created=await h.request('admin','POST','/audit-standard/audits',{brandId:'kfc',restaurantId:'restaurant-admin',date:'2026-10-16'});const parent=created.data.data;await h.assign('auditor',await h.models.Audit.findById(parent._id));
 const started=await h.request('admin','POST','/audit-execution',{auditId:parent._id});assert.equal(started.status,201);const e=started.data.data;
 const answers=standard.contentFor('kfc').sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'compliant'})));
 const submitted=await h.request('auditor','PUT',`/audit-execution/${e._id}/submit`,{answers,expectedVersion:0,details:{}});assert.equal(submitted.status,200,JSON.stringify(submitted.data));assert.equal(submitted.data.data.standardSubmission.actorId,String(h.actors.auditor._id));assert.equal((await h.models.Audit.findById(parent._id)).standardSubmission.name,'auditor');
 // Grant review permission explicitly; independence must still block the contributor.
 await h.models.Role.updateOne({key:'auditor'},{$push:{permissions:{resource:'audit.approval',action:'update',scope:'all'}}});
 const requested=await h.request('admin','POST','/audit-approval',{auditId:parent._id,reviewer:String(h.actors.auditor._id)});assert.equal(requested.status,403,JSON.stringify(requested.data));
 const directory=await h.request('admin','GET',`/audit-approval/${parent._id}/reviewers`);assert.equal(directory.status,200);assert.ok(!directory.data.data.some(row=>row.id===String(h.actors.auditor._id)));
 // Simulate a pre-existing pending request: resolution also checks independence.
 const pending=await require('../models/auditApproval.model').create({auditId:parent._id,requestedBy:String(h.actors.admin._id),reviewer:String(h.actors.auditor._id),status:'pending'});
 const denied=await h.request('auditor','PATCH',`/audit-approval/${pending._id}`,{status:'approved',naConfirmed:true});assert.equal(denied.status,403);assert.match(denied.data.message,/independent auditor/);
 await h.models.Role.updateOne({key:'auditor'},{$push:{permissions:{resource:'audit.approval',action:'create',scope:'assigned'}}});
 const independent=await h.request('auditor','POST','/audit-approval',{auditId:parent._id,reviewer:String(h.actors.admin._id)});assert.equal(independent.status,201,JSON.stringify(independent.data));
 assert.equal((await h.request('admin','PATCH',`/audit-approval/${independent.data.data._id}`,{status:'approved',naConfirmed:true})).status,200);
 const ownAnalytics=await h.request('admin','GET',`/audit-standard/analytics?auditorId=${h.actors.auditor._id}`);assert.equal(ownAnalytics.status,200);assert.equal(ownAnalytics.data.data.completed,1);
 const schedulerAnalytics=await h.request('admin','GET',`/audit-standard/analytics?auditorId=${h.actors.admin._id}`);assert.equal(schedulerAnalytics.data.data.completed,0);
 const XLSX=require('xlsx'),exported=await h.request('admin','GET',`/audit-export/${parent._id}/excel`);assert.equal(exported.status,200);const cover=XLSX.utils.sheet_to_json(XLSX.read(exported.buffer,{type:'buffer'}).Sheets.Cover)[0];assert.equal(cover.Auditor,'auditor');assert.equal(cover.CreatedBy,String(h.actors.admin._id));
}));
