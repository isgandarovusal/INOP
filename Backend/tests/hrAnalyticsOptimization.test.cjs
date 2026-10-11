const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{hrSyntheticDataset}=require('./helpers/hrSyntheticDataset.cjs');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
test('Analytics optimization keeps exact cohorts, bounded score batches and independent current parent scope',async t=>withAuditFixture(async h=>{
 const data=await hrSyntheticDataset(h,5000);let candidateReads=0,jobJoins=0;const find=Candidate.find,aggregate=Application.aggregate;
 Candidate.find=function(...a){candidateReads++;return find.apply(this,a);};Application.aggregate=function(...a){jobJoins+=a[0].filter(s=>s.$lookup?.from===Job.collection.name).length;return aggregate.apply(this,a);};
 try{const r=await h.request('admin','GET','/hr/analytics');assert.equal(r.status,200);assert.equal(r.data.totals.applications,5000);assert.equal(r.data.scores.states.calculated,5000);assert.equal(r.data.coverage.scoreScanConsistent,true);assert.equal(candidateReads,5,'1000-record batches replace20 old calls');assert.equal(jobJoins,0,'Bounded scoped Job identities avoid repeated heavy joins');assert.ok(!JSON.stringify(r.data).includes('@example.invalid'));}finally{Candidate.find=find;Application.aggregate=aggregate;}
 await t.test('More than500 scoped Jobs fall back without truncating the final Job/Application/brand',async()=>{
  const rows=Array.from({length:498},(_,i)=>({title:'Extra job '+i,description:'Synthetic',department:'Operations',brandId:i===497?'simit-sarayi':null,createdBy:h.actors.admin._id,departmentId:'dep_A'}));const extra=await Job.insertMany(rows);const c=await Candidate.findOne();await Application.create({jobId:extra.at(-1)._id,candidateId:c._id,createdBy:h.actors.admin._id,departmentId:'dep_A'});
  let joins=0;Application.aggregate=function(...a){joins+=a[0].filter(s=>s.$lookup?.from===Job.collection.name).length;return aggregate.apply(this,a);};
  try{const r=await h.request('admin','GET','/hr/analytics');assert.equal(r.status,200);assert.equal(r.data.totals.applications,5001);assert.equal(r.data.coverage.scoreScanConsistent,true);assert.equal(r.data.byBrand.find(v=>v.id==='simit-sarayi').applications,1667);assert.equal(joins,1);}finally{Application.aggregate=aggregate;await Application.deleteOne({jobId:extra.at(-1)._id});await Job.deleteMany({_id:{$in:extra.map(j=>j._id)}});}
 });
 await t.test('Scoped Job reassignment during aggregate yields409 and no counts or scores',async()=>{
  let entered,release,first=true;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  Application.aggregate=function(...a){const q=aggregate.apply(this,a),exec=q.exec;q.exec=async function(...x){const result=await exec.apply(this,x);if(first){first=false;entered();await gate;}return result;};return q;};
  try{const pending=h.request('own','GET','/hr/analytics');await ready;await Job.updateOne({_id:data.jobs[0]._id},{createdBy:h.actors.foreign._id});release();const r=await pending;assert.equal(r.status,409);assert.equal(r.data.code,'ANALYTICS_CHANGED');assert.equal(r.data.totals,undefined);assert.equal(r.data.scores,undefined);}finally{release();Application.aggregate=aggregate;await Job.updateOne({_id:data.jobs[0]._id},{createdBy:h.actors.own._id});}
 });
 await t.test('Empty scoped cohort remains a real zero with no invented scores',async()=>{
  const r=await h.request('own','GET','/hr/analytics?brandId=does-not-exist');assert.equal(r.status,200);assert.equal(r.data.totals.applications,0);assert.equal(r.data.coverage.scoreScanConsistent,true);assert.equal(r.data.scores.states.calculated,0);
 });
}));

test('Individual fingerprint optimization preserves ATS-v2 golden hashes from the previous release',()=>{
 const {fingerprints,jobFingerprint,candidateFingerprint,VERSION}=require('../services/applicationMatch.service');assert.equal(VERSION,'ats-v2');
 const job={title:'Kassir',requiredSkills:['Kassa','касса','Customer Service'],preferredSkills:['HACCP'],experienceYears:2};
 const candidate={role:'Cashier',skills:['cash handling','MÜŞTƏRİ XİDMƏTİ'],experience:0,education:'Tam orta təhsil',certificates:[],reviewedFields:['skills','experience'],cvReview:{reviewStatus:'confirmed'},employmentHistory:[{title:'Kassir',start:{year:2020,month:1},end:{year:2021,month:1},ongoing:false}]};
 const expected={jobHash:'cc4fe8d18c391e5daf8660e60c3b3b2a58f2c66c03152c832c86a8bd452479c3',candidateHash:'feca54c67fd2ac24743550235967dde7bbaee3f21ca73da9fd36892af2a08595'};
 assert.deepEqual(fingerprints(job,candidate),expected);assert.equal(jobFingerprint(job),expected.jobHash);assert.equal(candidateFingerprint(candidate),expected.candidateHash);
 assert.deepEqual(fingerprints({},{}),{jobHash:'60bc4519d5d072540b23a3993a45dbe860d22583cbbc823b8145bb6395eb8fb5',candidateHash:'a6a0a13cd7875114cc7c21a19525a2576e000437be3b9bca0550d16978e5be83'});
});
