const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const { hrSyntheticDataset } = require('./helpers/hrSyntheticDataset.cjs');
const Application = require('../models/application.model'), Candidate = require('../models/candidate.model'), Job = require('../models/job.model');
const { calculateApplicationMatch } = require('../services/applicationMatch.service');
if (process.env.INOP_ANALYTICS_BASELINE) {
  const sha = process.env.INOP_ANALYTICS_BASELINE;
  assert.match(sha, /^[a-f0-9]{40}$/);
  const file = require.resolve('../controllers/hrAnalytics.controller');
  const source = require('node:child_process').execFileSync('git', ['show', `${sha}:Backend/controllers/hrAnalytics.controller.js`], { cwd: require('node:path').resolve(__dirname, '../..'), encoding: 'utf8' });
  const baseline = new (require('node:module').Module)(file, module);
  baseline.filename = file; baseline.paths = module.paths; baseline._compile(source, file); require.cache[file] = baseline;
}

test('HR analytics serves 50k synthetic records inside the existing query deadline', async () => withAuditFixture(async h => {
  await hrSyntheticDataset(h, 50000);
  const r = await h.request('admin', 'GET', '/hr/analytics', undefined, { timeoutMs: 20000 });
  assert.equal(r.status, 200); assert.equal(r.data.totals.applications, 50000); assert.equal(r.data.coverage.scoreScanConsistent, true);
  assert.equal(r.data.scores.states.calculated, 50000); assert.equal(r.data.scores.buckets.reduce((n,b)=>n+b.count,0),50000);
  assert.equal(r.data.funnel.reduce((n,s)=>n+s.count,0),50000); assert.equal(r.data.byBrand.reduce((n,b)=>n+b.applications,0),50000);
  assert.ok(r.buffer.length < 16000); assert.ok(!r.buffer.toString().includes('Synthetic applicant')); assert.ok(!r.buffer.toString().includes('@example.invalid'));
}));

test('HR analytics cache boundaries and current authority cannot drop or disclose rows', async t => withAuditFixture(async h => {
  for (const scope of ['own', 'department', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application','candidate','recruitment'].map(resource=>({resource,action:'*',scope})) } });
  const provenance = { createdBy:h.actors.own._id, assignedTo:h.actors.assigned._id, departmentId:'dep_A' };
  const jobs = await Job.insertMany(Array.from({length:875},()=>({title:'Cashier',department:'HR',description:'Synthetic',requiredSkills:['cash handling'],...provenance})));
  const candidates = await Candidate.insertMany(Array.from({length:1000},(_,i)=>({name:`Synthetic cache ${i}`,role:'Cashier',skills:['cash handling'],...provenance})));
  const apps = candidates.map((c,i)=>{const job=jobs[i<750?i:i<875?i-625:i-125],app={jobId:job._id,candidateId:c._id,...provenance};const matching=calculateApplicationMatch(job,c,{application:app});return{...app,matching,score:matching.score,scoreStatus:matching.scoreStatus};});
  await Application.insertMany(apps);
  await t.test('875 distinct Job parents across a 500-entry cache preserve all 1000 scores',async()=>{
    const r=await h.request('admin','GET','/hr/analytics');assert.equal(r.status,200);assert.equal(r.data.totals.applications,1000);assert.equal(r.data.coverage.scoreScanConsistent,true);assert.equal(r.data.scores.states.calculated,1000);
  });
  await t.test('department/assigned parents and denied own Candidate retain independent aggregates',async()=>{
    for(const actor of ['own','department','assigned']){const r=await h.request(actor,'GET','/hr/analytics');assert.equal(r.status,200);assert.equal(r.data.totals.applications,1000);assert.equal(r.data.scores.states.calculated,1000);}
    await Candidate.updateOne({_id:candidates[0]._id},{$set:{createdBy:h.actors.foreign._id,departmentId:'dep_B',assignedTo:h.actors.foreign._id}});
    const r=await h.request('own','GET','/hr/analytics');assert.equal(r.data.totals.applications,1000);assert.equal(r.data.scores.states.restricted,1);
  });
  async function duringScan(change, code) {
    const aggregate=Application.aggregate;let entered,release,first=true;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
    Application.aggregate=function(...args){const q=aggregate.apply(this,args),exec=q.exec;q.exec=async function(...values){const rows=await exec.apply(this,values);if(first){first=false;entered();await gate;}return rows;};return q;};
    const role=await h.models.Role.findOne({key:'test_own'}).lean(), user=await h.models.User.findById(h.actors.own._id).lean();
    try{const pending=h.request('own','GET','/hr/analytics');await ready;await change(role);release();const r=await pending;assert.equal(r.status,code);assert.equal(r.data.totals,undefined);assert.equal(r.data.scores,undefined);}
    finally{release();Application.aggregate=aggregate;await h.models.Role.updateOne({_id:role._id},{permissions:role.permissions});await h.models.User.updateOne({_id:user._id},{isActive:true,departmentId:user.departmentId});}
  }
  await t.test('role read revocation during aggregate work produces 403 without aggregates',()=>duringScan(role=>h.models.Role.updateOne({_id:role._id},{permissions:[{resource:'application',action:'read',scope:'none'}]}),403));
  await t.test('account deactivation during aggregate work produces 403 without aggregates',()=>duringScan(()=>h.models.User.updateOne({_id:h.actors.own._id},{isActive:false}),403));
  await t.test('department change during aggregate work produces 409 restart without aggregates',()=>duringScan(()=>h.models.User.updateOne({_id:h.actors.own._id},{departmentId:'dep_B'}),409));
  await t.test('JWT revoked during aggregate work produces 401 without aggregates',async()=>{
    const RevokedToken=require('../models/revokedToken.model'),tokenHash=require('node:crypto').createHash('sha256').update(h.tokens.own).digest('hex');
    try{await duringScan(()=>RevokedToken.create({tokenHash,expiresAt:new Date(Date.now()+3600000)}),401);}finally{await RevokedToken.deleteOne({tokenHash});}
  });
}));
