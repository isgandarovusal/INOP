const test = require('node:test');
const assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Job = require('../models/job.model');
const Candidate = require('../models/candidate.model');
const Application = require('../models/application.model');

test('Canonical membership never infers HR access from a role, department label or wildcard', () => {
  const {isHRMember} = require('../services/hrDepartmentAccess.service');
  for (const departmentId of ['dep_A', 'dep_audit', 'HR', '', 'dep_HR']) assert.equal(isHRMember({role:'hr_manager',departmentId,permissions:[{resource:'*',action:'*',scope:'all'}]}),false);
  assert.equal(isHRMember({role:'admin',departmentId:''}),true);
  assert.equal(isHRMember({role:'employee',departmentId:'dep_hr'}),true);
});

test('HR department is a separate boundary from resource scopes and JWT role', async t => withAuditFixture(async h => {
  const job = await Job.create({ title: 'Synthetic HR vacancy', department: 'Operations', description: 'Synthetic role responsibilities' });
  const candidate = await Candidate.create({ name: 'Synthetic private candidate', role: 'Cashier' });
  const application = await Application.create({ jobId: job._id, candidateId: candidate._id });
  const reads = ['/jobs', `/jobs/${job._id}`, '/candidates', `/candidates/${candidate._id}`, '/applications', `/applications/${application._id}`, '/hr/v2/jobs', '/hr/v2/candidates', '/hr/v2/applications', '/hr/v2/application-board', '/hr/analytics', '/hr/brands', '/hr/branches', '/candidate-export/excel', `/candidate-export/${candidate._id}/pdf`, `/candidates/${candidate._id}/cv`, `/candidates/${candidate._id}/cv-preview`, `/candidates/${candidate._id}/processing`, '/hr/cv-intake', '/jobs/dashboard-summary', '/candidates/dashboard-summary', '/applications/dashboard-summary'];
  const writes = [['POST','/jobs'],['PUT',`/jobs/${job._id}`],['DELETE',`/jobs/${job._id}`],['POST','/candidates'],['PUT',`/candidates/${candidate._id}`],['DELETE',`/candidates/${candidate._id}`],['POST','/applications'],['PATCH',`/applications/${application._id}/workflow`],['DELETE',`/applications/${application._id}`],['POST','/candidates/parse-cv'],['POST','/candidates/from-cv'],['POST','/hr/ai/job-skills']];
  await h.models.User.updateOne({ _id: h.actors.hr._id }, { departmentId: 'dep_audit' });
  for (const scope of ['all', 'own', 'department', 'assigned', 'none']) await t.test(`Audit department cannot use ${scope} HR grants`, async () => {
    await h.models.Role.updateOne({ key: 'hr_manager' }, { permissions: ['candidate','recruitment','application'].map(resource => ({ resource, action: '*', scope })) });
    for (const endpoint of reads) assert.equal((await h.request('hr','GET',endpoint)).status,403,endpoint);
    for (const [method,endpoint] of writes) assert.equal((await h.request('hr',method,endpoint,{})).status,403,method+' '+endpoint);
  });
  await t.test('Admin access stays available outside HR; anonymous remains401', async () => {
    assert.equal((await h.request('admin','GET','/candidates')).status,200);
    assert.equal((await h.request('anonymous','GET','/candidates')).status,401);
  });
  await t.test('Unrelated Audit permissions remain available to Audit users', async () => {
    await h.models.Role.updateOne({ key: 'hr_manager' }, { permissions: [{resource:'audit',action:'read',scope:'all'},{resource:'candidate',action:'read',scope:'all'}] });
    assert.equal((await h.request('hr','GET','/audits')).status,200);
    assert.equal((await h.request('hr','GET','/candidates')).status,403);
  });
  await t.test('Current department controls old JWT; department membership never grants resource access', async () => {
    await h.models.User.updateOne({ _id: h.actors.hr._id }, { departmentId: 'dep_hr' });
    assert.equal((await h.request('hr','GET','/candidates')).status,200);
    assert.equal((await h.request('hr','GET','/jobs')).status,403);
    await h.models.User.updateOne({ _id: h.actors.hr._id }, { departmentId: '' });
    assert.equal((await h.request('hr','GET','/candidates')).status,403);
    const me = await h.request('hr','GET','/auth/me');
    assert.equal(me.data.user.hrAccess,false);
    await h.models.User.updateOne({ _id: h.actors.hr._id }, { departmentId: 'dep_hr' });
    assert.equal((await h.request('hr','GET','/auth/me')).data.user.hrAccess,true);
  });
  await t.test('Wildcard grants cannot admit an Audit actor or forge HR membership in body/headers', async () => {
    await h.models.Role.updateOne({key:'auditor'},{permissions:[{resource:'*',action:'*',scope:'all'}]});
    assert.equal((await h.request('auditor','GET','/candidates')).status,403);
    assert.equal((await h.request('auditor','POST','/candidates',{name:'Forged HR member',departmentId:'dep_hr',hrAccess:true})).status,403);
    assert.equal((await h.request('auditor','GET','/audits')).status,200);
    const {createActorContext}=require('../services/hrBackgroundActor.service');
    await assert.rejects(require('../services/hrCreateRecovery.service').current(createActorContext({enabled:true,actorId:String(h.actors.auditor._id),approvalRecorded:true}).request()),{status:403});
  });
  await t.test('CV bytes and legacy alias stay private after current department changes during IO', async () => {
    const storage=require('../services/hrPrivateObjectStorage.service'),bytes=Buffer.from('%PDF-1.4\nSynthetic private source\n%%EOF'),blob=storage.prepare(bytes,'application/pdf');
    await Candidate.updateOne({_id:candidate._id},{cvUrl:'/uploads/synthetic-private.pdf',privateCvBlob:blob});
    const factory=storage.fromEnvironment;
    storage.fromEnvironment=()=>({get:async()=>Buffer.from(bytes)});
    try {
      assert.equal((await h.request('hr','GET',`/candidates/${candidate._id}/cv`)).status,200);
      const legacy=async()=>fetch(h.apiBase.replace(/\/api$/,'')+'/uploads/synthetic-private.pdf',{headers:{Authorization:'Bearer '+h.tokens.hr}});
      assert.equal((await legacy()).status,200);
      storage.fromEnvironment=()=>({get:async()=>{await h.models.User.updateOne({_id:h.actors.hr._id},{departmentId:'dep_audit'});return Buffer.from(bytes);}});
      const denied=await h.request('hr','GET',`/candidates/${candidate._id}/cv`);
      assert.equal(denied.status,403);assert.ok(!denied.buffer.equals(bytes));
      assert.equal((await legacy()).status,403);
    } finally {storage.fromEnvironment=factory;}
  });
}, { canonicalHR: true }));
