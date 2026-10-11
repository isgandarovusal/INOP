const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Candidate=require('../models/candidate.model'),Job=require('../models/job.model'),Application=require('../models/application.model');
test('Candidate archive/restore preserves linked applications, history and sources without permanent deletion',async t=>withAuditFixture(async h=>{
 const p={createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A'};
 const c=await Candidate.create({name:'Retained candidate',role:'Cashier',cvUrl:'/uploads/retained-original.pdf',...p});
 const job=await Job.create({title:'Retained vacancy',description:'Synthetic',department:'Operations',status:'Open',...p});
 const app=await Application.create({candidateId:c._id,jobId:job._id,...p});
 await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'candidate',action:'*',scope:'own'},{resource:'application',action:'read',scope:'own'},{resource:'recruitment',action:'read',scope:'own'}]});
 await t.test('Archive is CAS-protected, retains original and Application, removes active list/count/lookup',async()=>{
  const r=await h.request('own','POST',`/candidates/${c._id}/archive`,{expectedRevision:0,reason:'Duplicate review pending'});assert.equal(r.status,200);
  const stored=await Candidate.findById(c._id);assert.ok(stored.archivedAt);assert.equal(stored.cvUrl,c.cvUrl);assert.equal(await Application.countDocuments({_id:app._id}),1);assert.equal(stored.__v,1);
  assert.equal((await h.request('own','GET','/candidates')).data.length,0);
  assert.equal((await h.request('own','GET','/hr/v2/candidates')).data.total,0);
  assert.equal((await h.request('own','GET','/candidates/dashboard-summary')).data.total,0);
  assert.equal((await h.request('own','GET','/hr/v2/candidates?archived=true')).data.total,1);
  assert.equal((await h.request('own','GET',`/applications/${app._id}`)).data.candidateId.name,c.name);
  assert.equal((await h.request('own','PUT',`/candidates/${c._id}`,{name:'Must not edit archived'})).status,409);
  assert.equal((await h.request('admin','POST','/applications',{candidateId:String(c._id),jobId:String(job._id)})).status,409);
 });
 await t.test('Stale restore409, current scoped restore preserves history and rejects client actor override',async()=>{
  assert.equal((await h.request('own','POST',`/candidates/${c._id}/restore`,{expectedRevision:0})).status,409);
  assert.equal((await h.request('own','POST',`/candidates/${c._id}/restore`,{expectedRevision:1,actor:'forged'})).status,400);
  assert.equal((await h.request('own','POST',`/candidates/${c._id}/restore`,{expectedRevision:1})).status,200);
  assert.equal((await h.request('own','GET','/hr/v2/candidates')).data.total,1);
  const history=await h.request('own','GET',`/candidates/${c._id}/archive-history`);assert.equal(history.status,200);assert.deepEqual(history.data.items.map(v=>v.action),['archive','restore']);assert.ok(history.data.items.every(v=>String(v.actor)===String(h.actors.own._id)));
 });
 await t.test('Legacy DELETE archives idempotently; no route permanently removes record',async()=>{
  assert.equal((await h.request('own','DELETE',`/candidates/${c._id}`)).status,200);
  assert.equal((await h.request('own','DELETE',`/candidates/${c._id}`)).status,200);
  const row=await Candidate.findById(c._id);assert.ok(row.archivedAt);assert.equal(row.__v,3);assert.equal(await Application.countDocuments({_id:app._id}),1);
 });
 await t.test('Foreign own/department/assigned and non-HR users cannot restore or inspect archive history',async()=>{
  for(const scope of ['own','department','assigned']){
   await h.models.Role.updateOne({key:'test_none'},{permissions:[{resource:'candidate',action:'*',scope}]});
   await h.models.User.updateOne({_id:h.actors.none._id},{departmentId:'dep_B'});
   assert.equal((await h.request('none','POST',`/candidates/${c._id}/restore`,{expectedRevision:3})).status,404);
   assert.equal((await h.request('none','GET',`/candidates/${c._id}/archive-history`)).status,404);
  }
  await h.models.User.updateOne({_id:h.actors.none._id},{departmentId:'dep_audit'});
  assert.equal((await h.request('none','POST',`/candidates/${c._id}/restore`,{expectedRevision:3})).status,403);
  assert.equal((await h.request('anonymous','POST',`/candidates/${c._id}/restore`,{expectedRevision:3})).status,401);
  assert.equal((await h.request('admin','POST',`/candidates/${c._id}/restore`,{expectedRevision:3})).status,200);
 });
 await t.test('Concurrent restore emits exactly one event and returns409 to stale caller',async()=>{
  assert.equal((await h.request('admin','POST',`/candidates/${c._id}/archive`,{expectedRevision:4})).status,200);
  const responses=await Promise.all([1,2].map(()=>h.request('admin','POST',`/candidates/${c._id}/restore`,{expectedRevision:5})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const history=await h.request('admin','GET',`/candidates/${c._id}/archive-history`);assert.equal(history.data.items.filter(v=>v.revision===6).length,1);
 });
 await t.test('Permanent deletion fields and malformed archive filters fail closed',async()=>{
  assert.equal((await h.request('admin','DELETE',`/candidates/${c._id}`,{permanent:true})).status,400);
  assert.equal((await h.request('admin','GET','/hr/v2/candidates?archived=all')).status,400);
  assert.equal((await h.request('admin','GET','/hr/v2/applications?archived=true')).status,400);
  assert.ok(await Candidate.exists({_id:c._id}));assert.ok(await Application.exists({_id:app._id}));
 });
}));
