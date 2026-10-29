const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { Readable } = require('node:stream');
const { createRunner, MODEL, ENVIRONMENT, APPROVAL, CANARY_APPROVAL, GATES, assertNoReflections, serializeArtifact } = require('../scripts/verifyCloudflareAiSynthetic.cjs');
const benchmark = require('../scripts/evaluateRecruitmentAi.cjs');
const SHA = 'a'.repeat(40);
const env = () => ({ GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REPOSITORY: 'isgandarovusal/INOP', GITHUB_REF: 'refs/heads/inop-main', GITHUB_ACTOR: 'isgandarovusal', GITHUB_TRIGGERING_ACTOR: 'isgandarovusal', GITHUB_RUN_ATTEMPT: '1', GITHUB_RUN_ID: '123', GITHUB_SHA: SHA, GITHUB_WORKFLOW_SHA: SHA, GITHUB_WORKFLOW_REF: 'isgandarovusal/INOP/.github/workflows/cf-ai-synthetic-evaluation.yml@refs/heads/inop-main', CF_AI_APPROVED_SHA: SHA, CF_AI_MODE: 'BENCHMARK', CF_AI_APPROVAL: APPROVAL, CF_AI_TRANSFER_APPROVED: 'true', CF_AI_QUOTA_CONFIRMED: 'true', CF_AI_SYNTHETIC_ENABLED: 'true', GH_TOKEN: 'github-synthetic-secret-only', CF_AI_EVAL_ACCOUNT_ID: 'c'.repeat(32), CF_AI_EVAL_API_TOKEN: 'cloudflare-synthetic-secret-only', ...Object.fromEntries(GATES.map(k => [k, 'false'])) });
const policy = () => ({ name: ENVIRONMENT, can_admins_bypass: false, protection_rules: [{ type: 'required_reviewers', reviewers: [{ type: 'User', reviewer: { login: 'isgandarovusal' } }] }], deployment_branch_policy: { custom_branch_policies: true, protected_branches: false } });
const branches = () => ({ total_count: 1, branch_policies: [{ name: 'inop-main', type: 'branch' }] });
const response = (data, status = 200) => ({ status, body: Readable.from([JSON.stringify(data)]) });
function harness({ change = {}, protection = policy(), branchRules = branches(), head = SHA, ai, meta, deadlineMs, save } = {}) {
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
  const store = { claim() { if (claims++) throw Error('PRIVATE'); }, save(text) { if (save) save(text); else records.push(JSON.parse(text)); } };
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
  const r = h.records[0]; assert.equal(r.execution, 'SIMULATED_TEST_TRANSPORT'); assert.equal(r.productionReady, false); assert.equal(r.complete, true); assert.equal(r.cases.length, 36); assert.ok(r.cases.every(c => c.schemaValid && c.relationCorrect && c.evidenceCorrect));
  assert.equal(r.cases[0].caseId, 'az-exact'); assert.equal(r.cases[0].repeat, 1);
  assert.equal(r.baseline.length, 12); assert.equal(r.explanationQuality, 'NOT_PUBLISHED_NOT_ASSESSED');
  for (const forbidden of ['syntheticResults','assessment','criteria','explanation','messages']) assert.ok(!Object.hasOwn(r, forbidden));
  const content = JSON.stringify(r); for (const secret of [env().CF_AI_EVAL_ACCOUNT_ID, env().CF_AI_EVAL_API_TOKEN, env().GH_TOKEN]) assert.ok(!content.includes(secret));
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 36);
});
for (const status of [400, 401, 403, 429, 500, 302]) test(`HTTP ${status} stops on the first canary, zero retries`, async () => {
  const h = harness({ ai: async () => response({ secret: 'PRIVATE' }, status) }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.equal(h.records.length, 0); assert.ok(!JSON.stringify(h.records).includes('PRIVATE'));
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
    const h = harness({ ai }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.equal(h.records.length, 0);
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
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 36); assert.equal(h.records.length, 0); assert.ok(h.codes.includes('AI_SEMANTIC_MISMATCH'));
});
test('Workflow is manual-only, pinned, protected, default-off and secrets are execute-step-only', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/cf-ai-synthetic-evaluation.yml'), 'utf8');
  assert.match(text, /^on:\n  workflow_dispatch:/m); assert.ok(!/^  (push|pull_request|schedule|workflow_run|deployment):/m.test(text));
  assert.match(text, /cancel-in-progress: false/); assert.match(text, /environment: cf-ai-synthetic-evaluation/); assert.match(text, /vars.CF_AI_SYNTHETIC_ENABLED == 'true'/);
  assert.ok(!text.split('  evaluate:')[0].includes('secrets.'));
  assert.equal((text.match(/secrets\./g) || []).length, 2);
  assert.ok(!text.includes('npm ci')); assert.ok(!text.includes('R2_')); assert.ok(!text.includes('MONGO'));
  for (const line of text.split('\n').filter(l => l.includes('uses:'))) assert.match(line, /@[a-f0-9]{40}/);
  assert.ok(!text.includes('if: always()'));
  assert.ok(text.includes("if: success() && steps.evaluate.outcome == 'success' && steps.evaluate.outputs.artifact_safe == 'true'"));
  assert.match(text, /if-no-files-found: error/);
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
  const another = harness({ save() { throw Error('PRIVATE'); } });
  assert.equal(await another.runner.run('--execute'), false); assert.equal(another.count(), 36); assert.equal(another.records.length, 0); assert.ok(another.codes.includes('AI_REPORT_FAILED'));
});

test('Encoded reflection regression: decoded synthetic credentials must never reach an artifact', async () => {
  for (const secret of [env().CF_AI_EVAL_API_TOKEN, env().CF_AI_EVAL_ACCOUNT_ID, env().GH_TOKEN]) {
    for (const depth of [1, 2, 4]) {
      const h = harness({ ai: async d => {
        let encoded = '\\u' + secret.charCodeAt(0).toString(16).padStart(4, '0') + secret.slice(1);
        for (let i = 1; i < depth; i++) encoded = JSON.stringify(encoded).slice(1, -1);
        const content = JSON.parse(d.choices[0].message.content);
        content.criteria[0].explanation = 'Reflection placeholder';
        d.choices[0].message.content = JSON.stringify(content).replace('Reflection placeholder', encoded);
        return response(d);
      } });
      assert.equal(await h.runner.run('--execute'), false);
      assert.equal(h.records.length, 0, 'No artifact after encoded-reflection rejection');
      assert.equal(h.count(), 1, 'No retry after unsafe canary');
      for (const value of [env().CF_AI_EVAL_API_TOKEN, env().CF_AI_EVAL_ACCOUNT_ID, env().GH_TOKEN]) assert.ok(!h.codes.join().includes(value));
    }
  }
});


test('Recursive checks reject arrays, object keys, nested JSON and repeated escape transformations', () => {
  const secrets = [env().CF_AI_EVAL_API_TOKEN, env().CF_AI_EVAL_ACCOUNT_ID, env().GH_TOKEN];
  for (const secret of secrets) {
    const escaped = '\\u' + secret.charCodeAt(0).toString(16).padStart(4, '0') + secret.slice(1);
    for (const value of [{ nested: [secret] }, { [escaped]: 'value' }, JSON.stringify({ nested: [escaped] }), JSON.stringify(JSON.stringify({ nested: [escaped] }))]) assert.throws(() => assertNoReflections(value, secrets));
  }
  assert.doesNotThrow(() => assertNoReflections({ nested: ['Ordinary fictional professional evidence'] }, secrets));
  let excessive = 'normal'; for (let i = 0; i < 20; i++) excessive = [excessive];
  assert.throws(() => assertNoReflections(excessive, secrets));
});
test('Model prose, nested extras, prompts and identifiers cannot enter the metrics-only artifact', async () => {
  const h = harness({ ai: async d => {
    const content = JSON.parse(d.choices[0].message.content);
    content.criteria[0].explanation = 'Fictional private prose never publish this';
    d.choices[0].message.content = JSON.stringify(content); return response(d);
  } });
  assert.equal(await h.runner.run('--execute'), true);
  const report = h.records[0], serialized = JSON.stringify(report);
  assert.ok(!serialized.includes('Fictional private prose'));
  assert.ok(!serialized.includes('explanation:'));
  assert.equal(report.productionReady, false);
  for (const mutate of [r => r.raw = 'unsafe', r => r.cases[0].explanation = 'unsafe', r => r.cases[0].latencyMs = 'unsafe', r => r.cases[0].caseId = 'unsafe', r => r.baseline[0].prompt = 'unsafe', r => r.cases[0].verdict = 'unsafe']) {
    const value = structuredClone(report); mutate(value); assert.throws(() => serializeArtifact(value, []));
  }
  assert.throws(() => serializeArtifact(report, [MODEL]), 'Final artifact check must reject even an allowlisted string matching a configured secret');
});
test('A safe first response cannot produce a partial artifact after a later unsafe response', async () => {
  const h = harness({ ai: async (d, n) => { if (n === 2) d.untrusted = [{ secret: env().GH_TOKEN }]; return response(d); } });
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 2); assert.equal(h.records.length, 0);
  assert.ok(h.codes.every(code => /^[A-Z_]+$/.test(code)));
});

const canary = { CF_AI_MODE: 'CANARY', CF_AI_APPROVAL: CANARY_APPROVAL, CF_AI_CANARY_APPROVED: 'true', CF_AI_QUOTA_CONFIRMED: 'false' };
test('CANARY succeeds with exactly one inference, cannot fall through or execute again', async () => {
  const h = harness({ change: canary });
  assert.equal(await h.runner.run('--execute'), true); assert.equal(h.count(), 1); assert.equal(h.records.length, 1);
  const r = h.records[0]; assert.equal(r.mode, 'CANARY'); assert.equal(r.attempted, 1); assert.equal(r.authentication, 'CONFIRMED'); assert.equal(r.modelAccepted, true); assert.equal(r.httpCategory, '2XX'); assert.equal(r.schemaValid, true); assert.equal(r.withinDeadline, true); assert.equal(r.benchmarkCompleted, false); assert.equal(r.quotaRemaining, 'UNKNOWN'); assert.equal(r.productionReady, false);
  assert.ok(r.latencyMs <= 8000); assert.equal(r.execution, 'SIMULATED_TEST_TRANSPORT');
  assert.ok(!JSON.stringify(r).includes('explanation')); assert.ok(!h.codes.includes('AI_CASE_VALID')); assert.ok(!h.codes.includes('AI_SYNTHETIC_QA_COMPLETE'));
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1);
});
test('Mode is explicit, DISABLED/absent never runs; benchmark cannot inherit canary approval', async () => {
  for (const change of [{ CF_AI_MODE: undefined }, { CF_AI_MODE: 'DISABLED' }, { CF_AI_MODE: 'other' }, { ...canary, CF_AI_CANARY_APPROVED: 'false' }, { ...canary, CF_AI_APPROVAL: APPROVAL }, { ...canary, CF_AI_MODE: 'BENCHMARK', CF_AI_APPROVAL: APPROVAL }]) {
    const h = harness({ change }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.calls.length, 0);
  }
});
test('CANARY default-off, owner/branch/SHA/reviewer guards remain mandatory', async () => {
  for (const change of [{ CF_AI_SYNTHETIC_ENABLED: 'false' }, { GITHUB_ACTOR: 'other' }, { GITHUB_REF: 'refs/heads/other' }, { CF_AI_APPROVED_SHA: 'b'.repeat(40) }]) {
    const h = harness({ change: { ...canary, ...change } }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 0);
  }
  const h = harness({ change: canary, protection: { ...policy(), can_admins_bypass: true } }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 0);
});
test('Failed CANARY HTTP/schema/timeout/config stops immediately, never retries or publishes partial data', async () => {
  for (const ai of [async () => response({}, 401), async () => response({}, 429), async () => response({}, 500), async d => { d.choices[0].message.content = '{}'; return response(d); }, async () => new Promise(() => {})]) {
    const h = harness({ change: canary, ai, deadlineMs: 15 }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.equal(h.records.length, 0); assert.ok(h.codes.includes('AI_CANARY_FAILED'));
  }
  const h = harness({ change: { ...canary, CF_AI_EVAL_API_TOKEN: '' } }); assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 0); assert.equal(h.records.length, 0);
});
test('CANARY keeps encoded-secret rejection and final artifact allowlist', async () => {
  const h = harness({ change: canary, ai: async d => {
    const value = JSON.parse(d.choices[0].message.content); value.criteria[0].explanation = env().CF_AI_EVAL_API_TOKEN;
    d.choices[0].message.content = JSON.stringify(value).replace('cloudflare-', '\\u0063loudflare-'); return response(d);
  } });
  assert.equal(await h.runner.run('--execute'), false); assert.equal(h.count(), 1); assert.equal(h.records.length, 0);
  const good = harness({ change: canary }); assert.equal(await good.runner.run('--execute'), true);
  for (const mutate of [r => r.raw = 'unsafe', r => r.attempted = 2, r => r.schemaValid = false, r => r.httpCategory = 'arbitrary', r => r.benchmarkCompleted = true, r => r.latencyMs = 8001]) {
    const r = structuredClone(good.records[0]); mutate(r); assert.throws(() => serializeArtifact(r, []));
  }
  assert.throws(() => serializeArtifact(good.records[0], [MODEL]));
});
test('CANARY establishes protocol only, never claims semantic matching or remaining batch quota', async () => {
  const h = harness({ change: canary, ai: async d => { const value = JSON.parse(d.choices[0].message.content); value.criteria[0].relation = 'contradicted'; d.choices[0].message.content = JSON.stringify(value); return response(d); } });
  assert.equal(await h.runner.run('--execute'), true); assert.equal(h.count(), 1);
  assert.equal(h.records[0].quotaRemaining, 'UNKNOWN'); assert.equal(h.records[0].productionReady, false); assert.equal(h.records[0].benchmarkCompleted, false);
});
test('Workflow default is non-executing; same protected jobs explicitly receive selected mode', () => {
  const text = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/cf-ai-synthetic-evaluation.yml'), 'utf8');
  assert.match(text, /default: DISABLED/); assert.equal((text.match(/CF_AI_MODE: \$\{\{ inputs.mode \}\}/g) || []).length, 2);
  assert.ok(text.includes("inputs.mode == 'CANARY' || inputs.mode == 'BENCHMARK'"));
  assert.equal((text.match(/CF_AI_CANARY_APPROVED:/g) || []).length, 2); assert.ok(!text.includes('npm ci'));
});

test('CANARY distinguishes network failure from unsafe artifact publication without retry', async () => {
  const network = harness({ change: canary, ai: async () => { throw Error('PRIVATE NETWORK DETAILS'); } });
  assert.equal(await network.runner.run('--execute'), false); assert.equal(network.count(), 1); assert.ok(network.codes.includes('AI_PROVIDER_FAILED')); assert.equal(network.records.length, 0);
  const storage = harness({ change: canary, save() { throw Error('PRIVATE PATH'); } });
  assert.equal(await storage.runner.run('--execute'), false); assert.equal(storage.count(), 1); assert.ok(storage.codes.includes('AI_REPORT_FAILED')); assert.equal(storage.records.length, 0);
});
