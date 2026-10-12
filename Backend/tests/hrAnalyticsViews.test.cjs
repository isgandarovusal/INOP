const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{hrSyntheticDataset}=require('./helpers/hrSyntheticDataset.cjs');
const Application=require('../models/application.model'),Job=require('../models/job.model'),Candidate=require('../models/candidate.model');
const views=['overview','scores','operations'];
test('Independent analytics views preserve exact scope/filters, bounded facts and current authority',async t=>withAuditFixture(async h=>{
 const fixture=await hrSyntheticDataset(h,5000);
 for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' view equivalence',async()=>{
  const full=await h.request(actor,'GET','/hr/analytics');assert.equal(full.status,200);
  for(const view of views){const r=await h.request(actor,'GET','/hr/analytics/'+view);assert.equal(r.status,200);
   if(view==='scores'){assert.deepEqual(r.data.scores,full.data.scores);assert.equal(r.data.total,full.data.totals.applications);assert.equal(r.data.consistent,true);}
   else {assert.deepEqual(r.data.totals,full.data.totals);assert.deepEqual(r.data.funnel,full.data.funnel);assert.deepEqual(r.data.sources,full.data.sources);assert.deepEqual(r.data.byBrand,full.data.byBrand);
    if(view==='operations')for(const key of ['review','duplicateAlerts','interviews','deliveryQueue'])assert.deepEqual(r.data[key],full.data[key]);
    else for(const key of ['scores','review','duplicateAlerts','interviews','deliveryQueue'])assert.equal(r.data[key],undefined);}
   assert.ok(r.buffer.length<16000);assert.doesNotMatch(r.buffer.toString(),/example.invalid|Synthetic applicant|employment evidence/);
  }
 });
 await t.test('Over500 scoped Jobs use equality joins without losing final-row counts or scores',async()=>{
  const extra=await Job.insertMany(Array.from({length:498},(_,i)=>({title:'Overflow '+i,department:'HR',description:'Synthetic',brandId:'simit-sarayi',createdBy:h.actors.admin._id,departmentId:'dep_A'})));
  const candidate=await Candidate.findOne();const app=await Application.create({jobId:extra.at(-1)._id,candidateId:candidate._id,createdBy:h.actors.admin._id,departmentId:'dep_A'});
  try{for(const view of views){const r=await h.request('admin','GET','/hr/analytics/'+view);assert.equal(r.status,200);assert.equal(view==='scores'?r.data.total:r.data.totals.applications,5001);if(view==='scores')assert.equal(r.data.consistent,true);else assert.equal(r.data.byBrand.find(b=>b.id==='simit-sarayi').applications,1667);}}finally{await Application.deleteOne({_id:app._id});await Job.deleteMany({_id:{$in:extra.map(j=>j._id)}});}
 });
 await t.test('Summary omits Candidate reads/lookups, fingerprints and Application event history',async()=>{
  const find=Candidate.find,aggregate=Application.aggregate;let reads=0,lookups=0,history=false;
  Candidate.find=function(...a){reads++;return find.apply(this,a);};Application.aggregate=function(...a){lookups+=a[0].filter(s=>s.$lookup?.from===Candidate.collection.name).length;history ||= JSON.stringify(a[0]).includes('events');return aggregate.apply(this,a);};
  try{const r=await h.request('admin','GET','/hr/analytics/overview');assert.equal(r.data.totals.applications,5000);assert.equal(reads,0);assert.equal(lookups,0);assert.equal(history,false);}finally{Candidate.find=find;Application.aggregate=aggregate;}
 });
 await t.test('Filters preserve real zero, parent denial and source totals',async()=>{
  for(const query of ['?brandId=kfc','?source=manual&status=Applied','?brandId=unmatched']){
   const full=await h.request('own','GET','/hr/analytics'+query);
   const summary=await h.request('own','GET','/hr/analytics/overview'+query),score=await h.request('own','GET','/hr/analytics/scores'+query);
   assert.deepEqual(summary.data.totals,full.data.totals);assert.deepEqual(summary.data.sources,full.data.sources);assert.equal(score.data.total,full.data.totals.applications);assert.deepEqual(score.data.scores,full.data.scores);
  }
 });
 await t.test('All Application + own Job + denied Candidate remains independent',async()=>{
  await h.models.Role.create({key:'views_mixed',name:'Mixed',permissions:[{resource:'application',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'own'}]});await h.models.User.updateOne({_id:h.actors.own._id},{role:'views_mixed'});
  try{for(const view of views){const r=await h.request('own','GET','/hr/analytics/'+view);assert.equal(r.status,200);if(view==='scores'){assert.equal(r.data.scores.states.restricted,5000);assert.equal(r.data.total,5000);}else {assert.equal(r.data.totals.applications,5000);if(view==='operations'){assert.equal(r.data.review.pending,0);assert.equal(r.data.coverage.restrictedCandidateApplications,5000);}}}}finally{await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});}
 });
 for(const view of views){
  await t.test(view+' rejects malformed/unauthenticated/none requests',async()=>{assert.equal((await h.request('anonymous','GET','/hr/analytics/'+view)).status,401);assert.equal((await h.request('none','GET','/hr/analytics/'+view)).status,403);assert.equal((await h.request('admin','GET','/hr/analytics/'+view+'?from=2026-02-30')).status,400);});
  for(const change of ['parent','role'])await t.test(view+' rechecks '+change+' before release',async()=>{
   const aggregate=Application.aggregate;let enter,release,first=true;const ready=new Promise(r=>enter=r),gate=new Promise(r=>release=r);const role=await h.models.Role.findOne({key:'test_own'}).lean();
   Application.aggregate=function(...a){const q=aggregate.apply(this,a),exec=q.exec;q.exec=async function(...b){const result=await exec.apply(this,b);if(first){first=false;enter();await gate;}return result;};return q;};
   try{const pending=h.request('own','GET','/hr/analytics/'+view);await ready;if(change==='parent')await Job.updateOne({_id:fixture.jobs[0]._id},{createdBy:h.actors.foreign._id});else await h.models.Role.updateOne({_id:role._id},{permissions:[{resource:'application',action:'read',scope:'none'}]});release();const r=await pending;assert.equal(r.status,change==='parent'?409:403);assert.equal(r.data.totals,undefined);assert.equal(r.data.scores,undefined);}
   finally{release();Application.aggregate=aggregate;await Job.updateOne({_id:fixture.jobs[0]._id},{createdBy:h.actors.own._id});await h.models.Role.updateOne({_id:role._id},{permissions:role.permissions});}
  });
 }
}));
test('Every analytics view uses canonical department admission without Audit wildcard bypass',async()=>withAuditFixture(async h=>{
 await h.models.User.updateOne({_id:h.actors.hr._id},{departmentId:'dep_hr'});
 for(const view of views){for(const actor of ['admin','hr'])assert.equal((await h.request(actor,'GET','/hr/analytics/'+view)).status,200);
 await h.models.Role.updateOne({key:'test_department'},{$set:{permissions:[{resource:'*',action:'*',scope:'all'}]}});assert.equal((await h.request('department','GET','/hr/analytics/'+view)).status,403);}
},{canonicalHR:true}));
