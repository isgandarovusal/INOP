const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
test('Job archive/restore retains Application parents and history, scoped CAS and no permanent deletion',async t=>withAuditFixture(async h=>{
 const p={createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A'};
 const job=await Job.create({title:'Retained vacancy',description:'Synthetic',department:'Operations',status:'Open',...p});
 const c=await Candidate.create({name:'Retained applicant',role:'Cashier',...p});
 const app=await Application.create({candidateId:c._id,jobId:job._id,events:[{type:'create',actor:h.actors.own._id,at:new Date(),revision:0,after:{status:'Applied'}}],...p});
 const original=await Application.findById(app._id).lean();
 await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'recruitment',action:'*',scope:'own'},{resource:'application',action:'*',scope:'own'},{resource:'candidate',action:'read',scope:'own'}]});
 await t.test('Legacy DELETE is reversible and idempotent, retains Job/Application/events/score parent',async()=>{
  assert.equal((await h.request('own','DELETE','/jobs/'+job._id)).status,200);
  assert.equal((await h.request('own','DELETE','/jobs/'+job._id)).status,200);
  const row=await Job.findById(job._id);assert.ok(row.archivedAt);assert.equal(row.status,'Open');assert.equal(row.__v,1);
  assert.deepEqual(await Application.findById(app._id).lean(),original);
  const detail=await h.request('own','GET','/applications/'+app._id);assert.equal(detail.status,200);assert.equal(String(detail.data.jobId._id),String(job._id));
 });
 await t.test('Active lists/summary/options exclude archived, history cohort remains visible and editable Job is blocked',async()=>{
  for(const path of ['/jobs','/hr/v2/jobs']){const r=await h.request('own','GET',path);assert.equal(r.status,200);assert.equal(Array.isArray(r.data)?r.data.length:r.data.total,0);}
  assert.equal((await h.request('own','GET','/jobs/dashboard-summary')).data.total,0);
  assert.equal((await h.request('own','GET','/hr/v2/jobs?archived=true')).data.total,1);
  assert.equal((await h.request('own','PUT','/jobs/'+job._id,{status:'Open'})).status,409);
  const analytics=await h.request('own','GET','/hr/analytics');assert.equal(analytics.status,200);assert.equal(analytics.data.totals.activeVacancies,0);assert.equal(analytics.data.totals.applications,1);assert.equal(analytics.data.options.jobs.length,0);
  const other=await Candidate.create({name:'New applicant',role:'Cashier',...p});assert.equal((await h.request('own','POST','/applications',{candidateId:String(other._id),jobId:String(job._id)})).data.code,'JOB_NOT_OPEN');
  assert.equal((await h.request('own','POST','/jobs/'+job._id+'/ai-skills',{})).status,404);
 });
 await t.test('Restore checks revisions, forged privilege fields and leaves original business status intact',async()=>{
  assert.equal((await h.request('own','POST','/jobs/'+job._id+'/restore',{expectedRevision:0})).status,409);
  assert.equal((await h.request('own','POST','/jobs/'+job._id+'/restore',{expectedRevision:1,actor:'forged'})).status,400);
  assert.equal((await h.request('own','POST','/jobs/'+job._id+'/restore',{expectedRevision:1})).status,200);
  assert.equal((await Job.findById(job._id)).status,'Open');assert.equal((await h.request('own','GET','/hr/v2/jobs')).data.total,1);
  const history=await h.request('own','GET','/jobs/'+job._id+'/archive-history');assert.equal(history.status,200);assert.deepEqual(history.data.items.map(v=>v.action),['archive','restore']);assert.ok(history.data.items.every(v=>String(v.actor)===String(h.actors.own._id)));
 });
 await t.test('Current updates advance revision so a stale archive cannot overwrite newer vacancy edits',async()=>{
  assert.equal((await h.request('own','PUT','/jobs/'+job._id,{title:'New legitimate title'})).status,200);
  assert.equal((await h.request('own','POST','/jobs/'+job._id+'/archive',{expectedRevision:2})).status,409);
  assert.equal((await Job.findById(job._id)).title,'New legitimate title');
  assert.equal((await h.request('own','POST','/jobs/'+job._id+'/archive',{expectedRevision:3})).status,200);
 });
 await t.test('Foreign mixed own/department/assigned, none, non-HR and old JWT are fail-closed, Admin preserved',async()=>{
  for(const scope of ['own','department','assigned']){
   await h.models.Role.updateOne({key:'test_none'},{permissions:[{resource:'recruitment',action:'*',scope}]});await h.models.User.updateOne({_id:h.actors.none._id},{departmentId:'dep_B'});
   assert.equal((await h.request('none','POST','/jobs/'+job._id+'/restore',{expectedRevision:4})).status,404);assert.equal((await h.request('none','GET','/jobs/'+job._id+'/archive-history')).status,404);
  }
  await h.models.Role.updateOne({key:'test_none'},{permissions:[{resource:'recruitment',action:'update',scope:'all'}]});assert.equal((await h.request('none','POST','/jobs/'+job._id+'/restore',{expectedRevision:4})).status,404,'Update alone never confers independent read');
  await h.models.User.updateOne({_id:h.actors.own._id},{departmentId:'dep_audit'});assert.equal((await h.request('own','POST','/jobs/'+job._id+'/restore',{expectedRevision:4})).status,403);await h.models.User.updateOne({_id:h.actors.own._id},{departmentId:'dep_A'});
  assert.equal((await h.request('anonymous','POST','/jobs/'+job._id+'/restore',{expectedRevision:4})).status,401);
  assert.equal((await h.request('admin','POST','/jobs/'+job._id+'/restore',{expectedRevision:4})).status,200);
 });
 await t.test('Concurrent archive/restore appends one atomic event, permanent erase/bad IDs/filters denied',async()=>{
  const rs=await Promise.all([1,2].map(()=>h.request('admin','POST','/jobs/'+job._id+'/archive',{expectedRevision:5})));assert.deepEqual(rs.map(v=>v.status).sort(),[200,409]);
  const history=await h.request('admin','GET','/jobs/'+job._id+'/archive-history');assert.equal(history.data.items.filter(v=>v.revision===6).length,1);
  assert.equal((await h.request('admin','DELETE','/jobs/'+job._id,{permanent:true})).status,400);assert.equal((await h.request('admin','GET','/hr/v2/jobs?archived=all')).status,400);assert.equal((await h.request('admin','POST','/jobs/invalid/archive',{expectedRevision:0})).status,400);
  assert.ok(await Job.exists({_id:job._id}));assert.ok(await Application.exists({_id:app._id}));
 });
}));
