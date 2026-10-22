const test=require('node:test'),assert=require('node:assert/strict');
const{withAuditFixture}=require('./helpers/auditFixture.cjs');
const Candidate=require('../models/candidate.model'),Job=require('../models/job.model'),Application=require('../models/application.model');
test('Profile status and Application-stage summaries preserve separate units, scopes and historical parents',async t=>withAuditFixture(async h=>{
 const fields=actor=>({createdBy:h.actors[actor]._id,departmentId:h.actors[actor].departmentId});
 const c1=await Candidate.create({...fields('own'),name:'Synthetic one',role:'Cashier',email:'same@example.invalid',status:'new'}),c2=await Candidate.create({...fields('peer'),name:'Synthetic two',role:'Cashier',email:'same@example.invalid',status:'shortlisted'});
 const j1=await Job.create({...fields('own'),title:'Synthetic one',department:'HR',description:'Synthetic'}),j2=await Job.create({...fields('peer'),title:'Synthetic two',department:'HR',description:'Synthetic'});
 const a1=await Application.create({...fields('own'),candidateId:c1._id,jobId:j1._id,status:'Shortlisted'}),a2=await Application.create({...fields('own'),candidateId:c1._id,jobId:j2._id,status:'Interview'}),a3=await Application.create({...fields('peer'),candidateId:c2._id,jobId:j1._id,status:'Shortlisted'});
 const read=async actor=>{const r=await h.request(actor,'GET','/applications/dashboard-summary');assert.equal(r.status,200);return r.data;};
 await t.test('two people, duplicate contact, three Applications; one person keeps two independent stages',async()=>{
  const s=await read('admin');assert.equal(s.total,3);assert.equal(s.pipeline.total,3);assert.equal(s.pipeline.shortlistedCount,2);assert.equal(s.pipeline.unit,'application');
  assert.equal((await Candidate.findById(c1._id)).status,'new');assert.equal((await Application.findById(a2._id)).status,'Interview');
  const candidates=await h.request('admin','GET','/candidates/dashboard-summary');assert.equal(candidates.data.total,2);assert.equal(candidates.data.shortlistedCount,1);
  const profile=await h.request('admin','GET','/hr/v2/candidates?status=shortlisted');assert.equal(profile.data.total,1);
  const list=await h.request('admin','GET','/hr/v2/applications?status=Shortlisted');assert.equal(list.data.total,2);
  const analytics=await h.request('admin','GET','/hr/analytics');assert.equal(analytics.status,200);assert.equal(analytics.data.totals.applications,3);assert.equal(analytics.data.funnel.find(x=>x.status==='Shortlisted').count,s.pipeline.shortlistedCount);
 });
 await t.test('archiving a profile or vacancy preserves Application history without inflating active profile/job totals',async()=>{
  await Candidate.updateOne({_id:c1._id},{$set:{archivedAt:new Date()}});await Job.updateOne({_id:j2._id},{$set:{archivedAt:new Date()}});
  const s=await read('admin');assert.equal(s.pipeline.total,3);assert.equal(s.pipeline.includesArchivedParents,true);assert.equal((await h.request('admin','GET','/candidates/dashboard-summary')).data.total,1);assert.equal((await h.request('admin','GET','/jobs/dashboard-summary')).data.total,1);
  await Candidate.updateOne({_id:c1._id},{$set:{archivedAt:null}});await Job.updateOne({_id:j2._id},{$set:{archivedAt:null}});
 });
 await t.test('independent Application/Job grants match analytics; restricted Candidate facts are unnecessary',async()=>{
  await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[{resource:'application',action:'read',scope:'own'},{resource:'recruitment',action:'read',scope:'own'}]}});
  const s=await read('own');assert.equal(s.total,2,'legacy total stays compatible');assert.equal(s.pipeline.total,1);assert.equal(s.pipeline.shortlistedCount,1);
  const analytics=await h.request('own','GET','/hr/analytics');assert.equal(analytics.status,200);assert.equal(analytics.data.totals.applications,1);
  await h.models.Role.updateOne({key:'test_assigned'},{$set:{permissions:[{resource:'application',action:'read',scope:'assigned'},{resource:'recruitment',action:'read',scope:'assigned'}]}});
  await Application.updateOne({_id:a1._id},{$set:{assignedTo:h.actors.assigned._id}});await Job.updateOne({_id:j1._id},{$set:{assignedTo:h.actors.assigned._id}});
  assert.equal((await read('assigned')).pipeline.total,1);
  await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[{resource:'application',action:'read',scope:'own'}]}});assert.equal((await read('own')).pipeline,null,'missing Job permission is unavailable, not zero');
 });
 await t.test('revoked current actor during aggregation cannot receive old stage counts',async()=>{
  let entered,release;const start=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const original=Application.aggregate;
  Application.aggregate=function(...args){const aggregate=original.apply(this,args),option=aggregate.option.bind(aggregate);aggregate.option=(...values)=>{option(...values);return aggregate.exec().then(async rows=>{entered();await gate;return rows;});};return aggregate;};
  try{const pending=h.request('admin','GET','/applications/dashboard-summary');await start;await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{isActive:false}});release();const response=await pending;assert.equal(response.status,403);assert.equal(response.data.pipeline,undefined);}
  finally{release();Application.aggregate=original;await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{isActive:true}});}
 });
 await t.test('old unknown profile states stay explicit in the new presentation without changing legacy API or stored data',async()=>{
  await Candidate.collection.updateOne({_id:c1._id},{$set:{status:'legacy_unknown'}});
  const r=await h.request('admin','GET','/candidates/dashboard-summary');assert.equal(r.data.profileStatusBreakdown.find(x=>x.status==='unknown').value,1);assert.equal(r.data.statusBreakdown.find(x=>x.status==='applied').value,1);assert.equal((await Candidate.findById(c1._id)).status,'legacy_unknown');
 });
 await t.test('unknown historical Application stages remain explicit, never silently relabelled Applied or omitted from totals',async()=>{
  await Application.collection.updateOne({_id:a3._id},{$set:{status:'LegacyUnknown'}});
  try{const s=await read('admin');assert.equal(s.pipeline.total,3);assert.equal(s.pipeline.unknownCount,1);assert.equal(s.pipeline.statusBreakdown.find(x=>x.status==='Applied').count,0);assert.equal(s.pipeline.shortlistedCount,1);}
  finally{await Application.collection.updateOne({_id:a3._id},{$set:{status:'Shortlisted'}});}
 });
 await t.test('large Job cohorts use the non-truncating fallback, and deleted Job parents do not leak into pipeline counts',async()=>{
  await Job.insertMany(Array.from({length:501},(_,i)=>({...fields('peer'),title:'Synthetic extra '+i,department:'HR',description:'Synthetic'})));
  const s=await read('admin');assert.equal(s.pipeline.total,3);
  await Job.deleteOne({_id:j2._id});const after=await read('admin');assert.equal(after.total,3);assert.equal(after.pipeline.total,2);assert.equal(after.pipeline.shortlistedCount,2);
 });
 await t.test('two HR writes with one revision give one winner; summary reflects the authoritative stage, never profile mutation',async()=>{
  const race=await Promise.all(['Screening','Interview'].map(status=>h.request('admin','PATCH','/applications/'+a1._id+'/status',{status,expectedRevision:a1.__v,reason:'Synthetic HR'})));assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);const s=await read('admin');assert.equal(s.pipeline.shortlistedCount,1);assert.equal((await Candidate.findById(c2._id)).status,'shortlisted');
 });
}));
