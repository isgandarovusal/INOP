const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { Readable } = require('node:stream');
const { createRunner, MODEL, ENVIRONMENT, APPROVAL, GATES } = require('../scripts/verifyCloudflareAiSynthetic.cjs');
const benchmark = require('../scripts/evaluateRecruitmentAi.cjs');
const SHA = 'a'.repeat(40);
const env = () => ({ GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REPOSITORY: 'isgandarovusal/INOP', GITHUB_REF: 'refs/heads/inop-main', GITHUB_ACTOR: 'isgandarovusal', GITHUB_TRIGGERING_ACTOR: 'isgandarovusal', GITHUB_RUN_ATTEMPT: '1', GITHUB_RUN_ID: '123', GITHUB_SHA: SHA, GITHUB_WORKFLOW_SHA: SHA, GITHUB_WORKFLOW_REF: 'isgandarovusal/INOP/.github/workflows/cf-ai-synthetic-evaluation.yml@refs/heads/inop-main', CF_AI_APPROVED_SHA: SHA, CF_AI_APPROVAL: APPROVAL, CF_AI_TRANSFER_APPROVED: 'true', CF_AI_QUOTA_CONFIRMED: 'true', CF_AI_SYNTHETIC_ENABLED: 'true', GH_TOKEN: 'github-synthetic-secret-only', CF_AI_EVAL_ACCOUNT_ID: 'c'.repeat(32), CF_AI_EVAL_API_TOKEN: 'cloudflare-synthetic-secret-only', ...Object.fromEntries(GATES.map(k => [k, 'false'])) });
const policy = () => ({ name: ENVIRONMENT, can_admins_bypass: false, protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { login: 'isgandarovusal' } }] }], deployment_branch_policy: { custom_branch_policies: true, protected_branches: false } });
const branches = () => ({ total_count: 1, branch_policies: [{ name: 'inop-main', type: 'branch' }] });
const response = (data, status = 200) => ({ status, body: Readable.from([JSON.stringify(data)]) });
function harness({ change = {}, protection = policy(), branchRules = branches(), head = SHA, ai, meta, deadlineMs } = {}) {
  const codes = [], calls = [], records = []; let active = 0, peak = 0, claims = 0;
  const settings = { ...env(), ...change };
  const fetcher = async (url, options) => {
    calls.push({ url, options }); assert.equal(options.redirect, 'error'); assert.ok(options.signal);
    if (url.startsWith('https://api.github.com/')) {
      assert.equal(options.method, 'GET'); assert.equal(options.headers.Authorization, 'Bearer ' + settings.GH_TOKEN);
      if (meta) return meta(url, options);
      return response(url.includes('/git/ref/') ? { object: { sha: head } } : url.includes('deployment-branch-policies') ? branchRules : protection);
    }
    assert.equal(url, 'https://api.cloudflare.com/client/v4/accounts/' + settings.CF_AI_EVAL_ACCOUNT_ID + '/ai/v1/chat/completions');
    assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, 'Bearer ' + settings.CF_AI_EVAL_API_TOKEN);
    const body = JSON.parse(options.body); assert.equal(body.model, MODEL); assert.equal(body.max_tokens, 512); assert.equal(body.temperature, 0); assert.equal(body.stream, false); assert.equal(body.options.rejectIfBusy, true); assert.equal(body.response_format.json_schema.strict, true);
    const text = options.body;
    for (const secret of [settings.CF_AI_EVAL_ACCOUNT_ID, settings.CF_AI_EVAL_API_TOKEN, settings.GH_TOKEN]) assert.ok(!text.includes(secret));
    assert.ok(!text.includes('cvOriginal')); assert.ok(!text.includes('gold'));
    const number = calls.filter(c => c.url.startsWith('https://api.cloudflare.com/')).length;
    const fixture = benchmark.fixtures[Math.floor((number - 1) / 3)];
    active++; peak = Math.max(peak, active);
    try {
      const data = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ criteria: [{ requirementId: 'r1', relation: fixture.gold.relation, evidenceIds: fixture.gold.evidenceIds, explanation: 'Synthetic professional evidence for human review.' }] }) } }], usage: { prompt_tokens: 300, completion_tokens: 80 } };
      return ai ? await ai(data, number, options) : response(data);
    } finally { active--; }
  };
  const store = { claim() { if (claims++) throw Error('PRIVATE'); }, save(report) { records.push(report); } };
  const runner = createRunner({ env: settings, fetcher, emit: code => codes.push(code), store, deadlineMs });
  return { runner, codes, calls, records, peak: () => peak, claims: () => claims, count: () => calls.filter(c => c.url.startsWith('https://api.cloudflare.com/')).length };
}
test('Manual-owner-reviewed-branch context only; unauthorized events never reach metadata or inference', async () => {
  for (const change of [{ GITHUB_ACTIONS: undefined }, ...['push', 'pull_request', 'schedule', 'deployment'].map(v => ({ GITHUB_EVENT_NAME: v })), { GITHUB_REF: 'refs/heads/other' }, { GITHUB_REPOSITORY: 'fork/INOP' }, { GITHUB_ACTOR: 'other' }, { GITHUB_TRIGGERING_ACTOR: 'other' }, { GITHUB_RUN_ATTEMPT: '2' }, { GITHUB_RUN_ID: 'invalid' }, { GITHUB_WORKFLOW_REF: 'untrusted' }]) {
    const h = harness({ change }); assert.equal(await h.runner.run('--execute'), false); assert.deepEqual(h.codes, ['AI_CONTEXT_REJECTED']); assert.equal(h.calls.length, 0);
  }
});
test('Default off, exact workflow SHA, explicit transfer/quota approvals and all closed CV gates required', async () => {
  for (const change of [{ CF_AI_SYNTHETIC_ENABLED: undefined }, { CF_AI_SYNTHETIC_ENABLED: 'false' }, { CF_AI_APPROVAL: 'yes' }, { CF_AI_TRANSFER_APPROVED: 'false' }, { CF_AI_QUOTA_CONFIRMED: 'false' }, { CF_AI_APPROVED_SHA: 'b'.repeat(40) }, { GITHUB_WORKFLOW_SHA: 'b'.repeat(40) }, ...GATES.map(k => ({ [k]: 'true' }))]) {
    const h = harness({ change }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.calls.length, 0); assert.deepEqual(h.codes, ['AI_APPROVAL_REQUIRED']);
  }
});
test('Protection, reviewer, bypass and exact branch policy fail closed', async () => {
  for (const protection of [{ ...policy(), name: 'other' }, { ...policy(), can_admins_bypass: true }, { ...policy(), protection_rules: [] }, { ...policy(), deployment_branch_policy: null }]) {
    const h = harness({ protection }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 0); assert.deepEqual(h.codes, ['AI_ENVIRONMENT_UNPROTECTED']);
  }
  for (const branchRules of [{ total_count: 0, branch_policies: [] }, { total_count: 2, branch_policies: [] }, { total_count: 1, branch_policies: [{ name: '*', type: 'branch' }] }, { total_count: 1, branch_policies: [{ name: 'inop-main', type: 'tag' }] }]) {
    const h = harness({ branchRules }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 0);
  }
  const stale = harness({ head: 'b'.repeat(40) }); assert.equal(await stale.runner.run('--execute'), false); assert.equal(stale.count(), 0);
});
test('Preflight needs no Cloudflare credentials and performs only three GitHub metadata GETs', async () => {
  const h = harness({ change: { CF_AI_EVAL_API_TOKEN: undefined, CF_AI_EVAL_ACCOUNT_ID: undefined } });
  assert.equal(await h.runner.run('--preflight'), true); assert.equal(h.count(), 0); assert.equal(h.calls.length, 3); assert.equal(h.claims(), 0); assert.equal(h.records.length, 0);
});
test('Metadata denial, malformed JSON, oversize and raw errors never leak or permit inference', async () => {
  for (const meta of [async () => response({}, 403), async () => response({}, 302), async () => { throw Error('PRIVATE TOKEN'); }, async () => ({ status: 200, body: Readable.from(['not JSON']) }), async () => ({ status: 200, body: Readable.from(['x'.repeat(65537)]) })]) {
    const h = harness({ meta }); assert.equal(await h.runner.run('--execute'), false); assert.deepEqual(h.codes, ['AI_PREFLIGHT_FAILED']); assert.equal(h.count(), 0);
  }
});
test('Missing credential/account config rejects before inference without revealing values', async () => {
  for (const change of [{ CF_AI_EVAL_API_TOKEN: '' }, { CF_AI_EVAL_API_TOKEN: 'newline\n' }, { CF_AI_EVAL_ACCOUNT_ID: 'invalid' }]) {
    const h = harness({ change }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 0); assert.equal(h.claims(), 0);
  }
});
test('Exactly 12 fixed cases x3 sequential requests, canary included, provider-neutral evaluator reused', async () => {
  const h = harness(); assert.equal(await h.runner.run('--execute'), true); assert.equal(h.count(), 36); assert.equal(h.peak(), 1);
  const r = h.records[0]; assert.equal(r.execution, 'SIMULATED_TEST_TRANSPORT'); assert.equal(r.assessment.execution, 'SIMULATED_NOT_MODEL_EVIDENCE'); assert.equal(r.productionReady, false); assert.equal(r.complete, true); assert.equal(r.syntheticResults.length, 36); assert.equal(r.semanticErrors, 0);
  assert.equal(r.syntheticResults[0].caseId, 'az-exact'); assert.equal(r.syntheticResults[0].repeat, 1);
  assert.ok(r.baseline.cases.every(c => c.matchesExpected)); assert.ok(r.assessment.consistency.every(c => c.consistent));
  const content = JSON.stringify(r); for (const secret of [env().CF_AI_EVAL_ACCOUNT_ID, env().CF_AI_EVAL_API_TOKEN, env().GH_TOKEN]) assert.ok(!content.includes(secret));
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 36);
});
for (const status of [400, 401, 403, 429, 500, 302]) test(`HTTP ${status} stops on the first canary, zero retries`, async () => {
  const h = harness({ ai: async () => response({ secret: 'PRIVATE' }, status) }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.equal(h.records[0].complete, false); assert.equal(h.records[0].syntheticResults.length, 0); assert.ok(!JSON.stringify(h.records).includes('PRIVATE'));
});
test('Canary schema failure, truncation, malformed/oversized content and reflected credentials stop safely', async () => {
  for (const ai of [
    async d => { d.choices[0].message.content = '{}'; return response(d); },
    async d => { d.choices[0].finish_reason = 'length'; return response(d); },
    async d => { d.choices[0].message.content = 'not JSON'; return response(d); },
    async () => ({ status: 200, body: Readable.from(['x'.repeat(32769)]) }),
    async d => { d.secret = env().CF_AI_EVAL_API_TOKEN; return response(d); },
    async d => { d.account = env().CF_AI_EVAL_ACCOUNT_ID; return response(d); },
    async () => { throw Error('PRIVATE TRANSPORT ERROR'); },
  ]) {
    const h = harness({ ai }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.equal(h.records[0].syntheticResults.length, 0);
    assert.ok(!JSON.stringify(h.records).includes('PRIVATE')); assert.ok(!h.codes.join().includes('secret'));
  }
});
test('Timeout includes fetch and response body, even when injected transport ignores cancellation', async () => {
  for (const ai of [async () => new Promise(() => {}), async () => ({ status: 200, body: { async *[Symbol.asyncIterator]() { await new Promise(() => {}); } } })]) {
    const h = harness({ ai, deadlineMs: 10 }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.ok(h.codes.includes('AI_TIMEOUT'));
  }
});
test('Unverifiable or over-cap token accounting never permits the next request', async () => {
  for (const usage of [undefined, { prompt_tokens: 1, completion_tokens: 513 }, { prompt_tokens: 32769, completion_tokens: 1 }, { prompt_tokens: 1, completion_tokens: 1, completion_tokens_details: { reasoning_tokens: 2 } }, { prompt_tokens: 1, completion_tokens: 1, completion_tokens_details: { reasoning_tokens: -1 } }]) {
    const h = harness({ ai: async d => { d.usage = usage; return response(d); } }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.ok(h.codes.includes('AI_USAGE_UNVERIFIED'));
  }
});
test('Schema-valid wrong semantics is preserved as a failed benchmark, not relabeled success', async () => {
  const h = harness({ ai: async (d, n) => { if (n === 1) { const value = JSON.parse(d.choices[0].message.content); value.criteria[0].relation = 'contradicted'; d.choices[0].message.content = JSON.stringify(value); } return response(d); } });
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 36); assert.equal(h.records[0].semanticErrors, 1); assert.equal(h.records[0].productionReady, false);
});
test('Workflow is manual-only, pinned, protected, default-off and secrets are execute-step-only', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/cf-ai-synthetic-evaluation.yml'), 'utf8');
  assert.match(text, /^on:\n  workflow_dispatch:/m); assert.ok(!/^  (push|pull_request|schedule|workflow_run|deployment):/m.test(text));
  assert.match(text, /cancel-in-progress: false/); assert.match(text, /environment: cf-ai-synthetic-evaluation/); assert.match(text, /vars.CF_AI_SYNTHETIC_ENABLED == 'true'/);
  assert.ok(!text.split('  evaluate:')[0].includes('secrets.'));
  assert.equal((text.match(/secrets\./g) || []).length, 2);
  assert.ok(!text.includes('npm ci')); assert.ok(!text.includes('R2_')); assert.ok(!text.includes('MONGO'));
  for (const line of text.split('\n').filter(l => l.includes('uses:'))) assert.match(line, /@[a-f0-9]{40}/);
  assert.match(text, /retention-days: 1/); assert.match(text, /path: work\/cf-ai-synthetic\/report.json/);
});

test('Persistent attempt claim failure and report-write failure are fail-closed', async () => {
  const settings = env(), codes = []; let inferred = 0;
  const fetcher = async url => {
    if (url.startsWith('https://api.cloudflare.com')) { inferred++; throw Error('DO_NOT_LOG'); }
    return response(url.includes('/git/ref/') ? { object: { sha: SHA } } : url.includes('deployment-branch-policies') ? branches() : policy());
  };
  const runner = createRunner({ env: settings, fetcher, emit: c => codes.push(c), store: { claim() { throw Object.assign(Error('PRIVATE'), { code: 'AI_ALREADY_ATTEMPTED' }); }, save() { assert.fail('Must not write after failed claim'); } } });
  assert.equal(await runner.run('--execute'), false); assert.equal(inferred, 0); assert.ok(codes.includes('AI_ALREADY_ATTEMPTED')); assert.ok(!codes.join().includes('PRIVATE'));
  const another = createRunner({ env: settings, fetcher, emit: c => codes.push(c), store: { claim() {}, save() { throw Error('PRIVATE'); } } });
  assert.equal(await another.run('--execute'), false); assert.equal(inferred, 1); assert.ok(codes.includes('AI_REPORT_FAILED'));
});
