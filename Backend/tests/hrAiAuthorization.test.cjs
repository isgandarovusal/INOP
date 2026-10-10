const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model'), Branch = require('../models/recruitmentBranch.model'), RevokedToken = require('../models/revokedToken.model');
const ai = require('../services/hrAiProvider.service');
const body = { title: 'Synthetic cashier', description: 'Cash handling and food safety', brandId: 'kfc', workplace: 'Baku', experienceYears: 1, requiredSkills: ['Cash handling'], preferredSkills: [] };
const result = { version: 'job-skills-v1', status: 'suggested', requiredSkills: [{ name: 'Food safety', reason: 'Vacancy duty', confidence: null }], preferredSkills: [], uncertainty: ['HR must review'], requiresApproval: true, provenance: { provider: 'openai', model: 'synthetic', mode: 'mock_test_only', contextHash: 'a'.repeat(64) } };
test('Job skills proposals preserve independent current server authority without mutations', async t => withAuditFixture(async h => {
  for (const scope of ['own','department','assigned','none']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: { resource: 'recruitment', action: '*', scope } } });
  const jobs = {};
  for (const name of ['own','foreign','peer']) jobs[name] = await Job.create({ title: name+' synthetic', description: 'Synthetic', department: 'Ops', createdBy: h.actors[name]._id, departmentId: h.actors[name].departmentId, assignedTo: name === 'peer' ? h.actors.assigned._id : h.actors[name]._id });
  const branch = await Branch.create({ code: 'ai-local', name: 'Synthetic KFC branch', kind: 'restaurant', brandId: 'kfc', createdBy: h.actors.own._id, assignedTo: h.actors.own._id, departmentId: 'dep_A' });
  const previous = ai.suggestJob;
  let calls = 0, captured, hook = async () => {};
  ai.suggestJob = async (context, options) => { calls++; captured = { context, actorId: options.actorId }; await hook(); return result; };
  const request = (actor, id, payload=body) => h.request(actor,'POST',id ? `/jobs/${id}/ai-skills` : '/hr/ai/job-skills',payload);
  try {
    await t.test('anonymous=401, none=403 before provider; missing parent=404', async () => {
      assert.equal((await request('anonymous')).status,401); assert.equal((await request('none')).status,403);
      assert.equal((await request('admin','000000000000000000000001')).status,404); assert.equal(calls,0);
    });
    for (const [actor,target,status] of [['admin','foreign',200],['hr','foreign',200],['own','own',200],['own','foreign',404],['department','peer',200],['department','foreign',404],['assigned','peer',200],['assigned','own',404]]) await t.test(`${actor} independent read/update scope ${target}=${status}`, async () => {
      const n = calls, r=await request(actor,jobs[target]._id); assert.equal(r.status,status); assert.equal(calls,n+(status===200?1:0));
      if(status===200){assert.equal(r.data.requiresApproval,true);assert.equal(r.data.provenance.mode,'mock_test_only');assert.equal(r.headers['cache-control'],'private, no-store');}
    });
    await t.test('draft scope/context is server-owned; body never supplies actor/role or foreign branch names',async () => {
      const n=calls;assert.equal((await request('own',null,{...body,branchId:String(branch._id)})).status,200);assert.equal(captured.context.brandName,'KFC');assert.ok(captured.context.workplace.includes(branch.name));assert.equal(captured.actorId,String(h.actors.own._id));
      assert.equal((await request('foreign',null,{...body,branchId:String(branch._id)})).status,400);assert.equal((await request('own',null,{...body,role:'admin'})).status,400);assert.equal((await request('own',null,{...body,workplace:{secret:'not-forwarded'}})).status,400);assert.equal(calls,n+1);
    });
    await t.test('read=all does not overwrite update=own (and the converse)',async () => {
      const role=await h.models.Role.findOne({key:'test_own'}), original=role.permissions;
      try {
        for(const [read,update] of [['all','own'],['own','all']]) {
          await h.models.Role.updateOne({_id:role._id},{$set:{permissions:[{resource:'recruitment',action:'read',scope:read},{resource:'recruitment',action:'update',scope:update}]}});
          assert.equal((await request('own',jobs.foreign._id)).status,404);assert.equal((await request('own',jobs.own._id)).status,200);
        }
        await h.models.Role.updateOne({_id:role._id},{$set:{permissions:[{resource:'recruitment',action:'update',scope:'all'}]}});assert.equal((await request('own',jobs.own._id)).status,403);
      } finally {await h.models.Role.updateOne({_id:role._id},{$set:{permissions:original}});}
    });
    for(const [kind,status] of [['permission',403],['inactive',403],['department',409],['revoked',401],['assignment',404],['job-change',409],['branch-change',409]]) await t.test(`latency recheck ${kind}=${status} without any proposal`,async () => {
      const actor=kind==='assignment'?'assigned':'own',target=kind==='assignment'?jobs.peer:jobs.own;
      const role=await h.models.Role.findOne({key:'test_own'}), original=role.permissions;
      hook=async()=>{
        if(kind==='permission')await h.models.Role.updateOne({_id:role._id},{$set:{permissions:[]}});
        if(kind==='inactive')await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:false}});
        if(kind==='department')await h.models.User.updateOne({_id:h.actors.own._id},{$set:{departmentId:'dep_B'}});
        if(kind==='revoked')await RevokedToken.create({tokenHash:crypto.createHash('sha256').update(h.tokens.own).digest('hex'),expiresAt:new Date(Date.now()+3600000)});
        if(kind==='assignment')await Job.updateOne({_id:target._id},{$set:{assignedTo:h.actors.foreign._id}});
        if(kind==='job-change')await Job.updateOne({_id:target._id},{$set:{description:'Concurrent update'}});
        if(kind==='branch-change')await Branch.updateOne({_id:branch._id},{$set:{name:'Concurrent branch name'}});
      };
      try {const r=await request(actor,target._id,{...body,...(kind==='branch-change'?{branchId:String(branch._id)}:{})});assert.equal(r.status,status);if(kind==='department')assert.equal(r.data.code,'AI_AUTHORIZATION_CHANGED');assert.equal(r.data.requiredSkills,undefined);assert.equal(r.data.provenance,undefined);}
      finally {hook=async()=>{};await h.models.Role.updateOne({_id:role._id},{$set:{permissions:original}});await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:true,departmentId:'dep_A'}});await RevokedToken.deleteMany({});await Job.updateOne({_id:jobs.peer._id},{$set:{assignedTo:h.actors.assigned._id}});}
    });
    await t.test('unconfigured provider is explicit 503; no synthetic fallback or data writes',async()=>{
      ai.suggestJob=previous;const before=await Job.find().lean();const r=await request('admin');assert.equal(r.status,503);assert.equal(r.data.code,'AI_UNAVAILABLE');assert.equal(r.data.requiredSkills,undefined);assert.deepEqual(await Job.find().lean(),before);
    });
  } finally { ai.suggestJob=previous; }
}));
