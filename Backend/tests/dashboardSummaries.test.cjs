const test=require('node:test'),assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Dashboard summary scope equals existing list contracts without private payloads',async t=>withAuditFixture(async h=>{
 const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model'),Snapshot=require('../models/auditDepartmentSnapshot.model');
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:`test_${scope}`},{$push:{permissions:{$each:['recruitment','candidate','application'].map(resource=>({resource,action:'read',scope}))}}});
 for(const owner of ['own','peer','assigned','foreign'])for(let i=0;i<10;i++){
  const fields={departmentId:h.actors[owner].departmentId,createdBy:h.actors[owner]._id,assignedTo:owner==='foreign'?h.actors.assigned._id:null};
  const job=await Job.create({...fields,title:'local',department:'local',description:'PRIVATE_JOB_DESCRIPTION',status:'Open'});
  const candidate=await Candidate.create({...fields,name:`${owner}-${i}`,role:'local',status:i%2?'shortlisted':'new',skills:['one','two','three','PRIVATE_SKILL'],education:'PRIVATE_CV',createdAt:new Date(2026,9,1,0,0,i)});
  await Application.create({...fields,jobId:job._id,candidateId:candidate._id,notes:'PRIVATE_APPLICATION_NOTES'});
  const audit=await h.audit(owner,'service',{overallPercentage:0,scores:null,checks:[{note:'PRIVATE_CHECKLIST'}]});
  await Snapshot.create({auditId:audit._id,auditorId:audit.auditorId,departmentId:h.actors[owner].departmentId});
  if(owner==='foreign')await h.assign('assigned',audit);
 }
 for(const actor of ['admin','hr','own','department','assigned'])for(const resource of ['jobs','candidates','applications','audits'])await t.test(`${actor}: ${resource} scoped summary`,async()=>{
  const list=await h.request(actor,'GET',`/${resource}`),summary=await h.request(actor,'GET',`/${resource}/dashboard-summary`);
  assert.equal(summary.status,list.status);if(list.status!==200)return;
  const expected=actor==='admin'||actor==='hr'?40:actor==='department'?30:actor==='assigned'&&resource==='audits'?20:10;
  assert.equal(list.data.length,expected);assert.equal(summary.data.total??summary.data.totalAudits,expected);
  const text=JSON.stringify(summary.data);for(const secret of ['PRIVATE_JOB_DESCRIPTION','PRIVATE_CV','PRIVATE_APPLICATION_NOTES','PRIVATE_CHECKLIST','PRIVATE_SKILL'])assert.equal(text.includes(secret),false);
  if(resource==='candidates'){assert.equal(summary.data.recentCandidates.length,5);assert.equal(summary.data.shortlistedCount,expected/2);assert.equal(summary.data.statusBreakdown.find(x=>x.status==='applied').value,expected/2);}
  if(resource==='audits'){assert.equal(summary.data.overallScore,0);assert.equal(summary.data.criticalCount,expected);}
 });
 for(const actor of ['none','department_missing','anonymous'])for(const resource of ['jobs','candidates','applications','audits'])await t.test(`${actor}: ${resource} denied`,async()=>{
  assert.equal((await h.request(actor,'GET',`/${resource}/dashboard-summary`)).status,actor==='anonymous'?401:403);
 });
 await t.test('Legacy without department snapshot is excluded; query input cannot expand scope',async()=>{
  await h.audit('foreign','service',{overallPercentage:100,departmentId:'dep_A'});
  const response=await h.request('department','GET','/audits/dashboard-summary?scope=all&auditorId=foreign');assert.equal(response.data.totalAudits,30);
 });
 await t.test('Audit analytics all grant never widens an assigned dashboard read summary',async()=>{
  const response=await h.request('auditor','GET','/audits/dashboard-summary');assert.equal(response.status,200);assert.equal(response.data.totalAudits,0);
 });
 await t.test('Server score expression preserves mixed canonical, legacy, zero and missing scores',async()=>{
  const {auditScoreExpression}=require('../services/auditScore.service');
  const cases=[
   [{auditType:'service',overallPercentage:0},0],
   [{auditType:'standard',compliancePercentage:80},8],
   [{auditType:'occupational-safety',totalScore:3,maxScore:4},7.5],
   [{type:'safety',scorePercentage:'90'},9],
   [{auditType:'service',scores:{food:2,cleanliness:4,staff:6,service:8}},5],
   [{auditType:'standard'},null],
   [{overallPercentage:50},5],
   [{auditType:'service',overallPercentage:true},null],
   [{auditType:'safety',totalScore:1,maxScore:0},null],
   [{auditType:'standard',compliancePercentage:101},null],
  ];
  const docs=cases.map(([fields],index)=>({id:`score-parity-${index}`,auditorId:String(h.actors.admin._id),...fields}));
  await h.models.Audit.collection.insertMany(docs);
  const result=await h.models.Audit.aggregate([{$match:{id:{$in:docs.map(item=>item.id)}}},{$sort:{id:1}},{$project:{id:1,score:auditScoreExpression}}]);
  for(const item of result)assert.equal(item.score,cases[Number(item.id.split('-').at(-1))][1],item.id);
 });
}));
