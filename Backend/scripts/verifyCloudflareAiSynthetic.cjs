// Manual synthetic QA only. Never imported by production routes/startup/providers.
const fs = require('node:fs'), path = require('node:path');
const benchmark = require('./evaluateRecruitmentAi.cjs');
const REPO = 'isgandarovusal/INOP', OWNER = 'isgandarovusal', BRANCH = 'refs/heads/inop-main';
const ENVIRONMENT = 'cf-ai-synthetic-evaluation', MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const APPROVAL = 'RUN UP TO 36 FICTIONAL AI REQUESTS';
const GATES = ['HR_CV_DURABLE_INTAKE_ENABLED', 'HR_CV_SCAN_ENABLED', 'HR_CV_INTAKE_WORKER_ENABLED', 'HR_CV_OCR_ENABLED', 'HR_CV_PROCESSING_ENABLED', 'HR_CV_AI_PROCESSING_ENABLED'];
const deny = code => Object.assign(Error('Synthetic evaluation unavailable.'), { code });
const CODES = new Set(['AI_CONTEXT_REJECTED', 'AI_APPROVAL_REQUIRED', 'AI_ENVIRONMENT_UNPROTECTED', 'AI_PREFLIGHT_FAILED', 'AI_CONFIG_INVALID', 'AI_TIMEOUT', 'AI_RESPONSE_INVALID', 'AI_AUTH_DENIED', 'AI_RATE_LIMITED', 'AI_REQUEST_REJECTED', 'AI_PROVIDER_FAILED', 'AI_OUTPUT_REJECTED', 'AI_USAGE_UNVERIFIED', 'AI_QUOTA_BOUND', 'AI_ALREADY_ATTEMPTED']);
function context(env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REPOSITORY !== REPO || env.GITHUB_REF !== BRANCH || env.GITHUB_ACTOR !== OWNER || env.GITHUB_TRIGGERING_ACTOR !== OWNER || env.GITHUB_RUN_ATTEMPT !== '1' || !/^\d+$/.test(env.GITHUB_RUN_ID || '') || env.GITHUB_WORKFLOW_REF !== REPO + '/.github/workflows/cf-ai-synthetic-evaluation.yml@' + BRANCH) throw deny('AI_CONTEXT_REJECTED');
  if (env.CF_AI_SYNTHETIC_ENABLED !== 'true' || env.CF_AI_APPROVAL !== APPROVAL || env.CF_AI_TRANSFER_APPROVED !== 'true' || env.CF_AI_QUOTA_CONFIRMED !== 'true' || !/^[a-f0-9]{40}$/.test(env.CF_AI_APPROVED_SHA || '') || env.CF_AI_APPROVED_SHA !== env.GITHUB_SHA || env.GITHUB_WORKFLOW_SHA !== env.GITHUB_SHA || GATES.some(k => env[k] !== 'false')) throw deny('AI_APPROVAL_REQUIRED');
}
async function request(url, options, fetcher, limit = 65536, timeout = 8000) {
  const controller = new AbortController(); let timer;
  try {
    return await Promise.race([(async () => {
      const response = await fetcher(url, { ...options, redirect: 'error', signal: controller.signal });
      if (response.status !== 200) return { status: response.status };
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body || []) { const b = Buffer.from(chunk); bytes += b.length; if (bytes > limit) throw deny('AI_RESPONSE_INVALID'); chunks.push(b); }
      try { return { status: 200, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) }; } catch { throw deny('AI_RESPONSE_INVALID'); }
    })(), new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(deny('AI_TIMEOUT')); }, timeout); })]);
  } finally { clearTimeout(timer); controller.abort(); }
}
async function preflight(env, fetcher) {
  context(env);
  if (!env.GH_TOKEN) throw deny('AI_PREFLIGHT_FAILED');
  const get = async suffix => { const r = await request('https://api.github.com/repos/' + REPO + suffix, { method: 'GET', headers: { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }, fetcher); if (r.status !== 200) throw deny('AI_PREFLIGHT_FAILED'); return r.data; };
  const policy = await get('/environments/' + ENVIRONMENT);
  if (policy.name !== ENVIRONMENT || policy.can_admins_bypass !== false || !policy.protection_rules?.some(p => p.type === 'required_reviewers' && p.reviewers?.some(r => r.type === 'User' && r.reviewer?.login === OWNER)) || policy.deployment_branch_policy?.custom_branch_policies !== true || policy.deployment_branch_policy?.protected_branches !== false) throw deny('AI_ENVIRONMENT_UNPROTECTED');
  const branches = await get('/environments/' + ENVIRONMENT + '/deployment-branch-policies?per_page=100');
  if (branches.total_count !== 1 || branches.branch_policies?.length !== 1 || branches.branch_policies[0].name !== 'inop-main' || branches.branch_policies[0].type !== 'branch') throw deny('AI_ENVIRONMENT_UNPROTECTED');
  if ((await get('/git/ref/heads/inop-main')).object?.sha !== env.CF_AI_APPROVED_SHA) throw deny('AI_APPROVAL_REQUIRED');
}
function bodyFor(item, schema) {
  return { model: MODEL, messages: [{ role: 'system', content: item.system }, { role: 'user', content: JSON.stringify(item.input) }], response_format: { type: 'json_schema', json_schema: { name: 'synthetic_match', strict: true, schema } }, max_tokens: 512, temperature: 0, stream: false, options: { rejectIfBusy: true } };
}
function outputStore() {
  const dir = path.resolve('work/cf-ai-synthetic');
  return {
    claim() { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); try { fs.closeSync(fs.openSync(path.join(dir, '.attempt'), 'wx', 0o600)); } catch { throw deny('AI_ALREADY_ATTEMPTED'); } },
    save(report) { fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 }); },
  };
}
function createRunner({ env = process.env, fetcher = fetch, emit = code => console.log(code), store = outputStore(), deadlineMs = 8000 } = {}) {
  // Shorter deadlines only for isolated tests; no runtime flag can raise the 8s bound.
  const deadline = Math.min(8000, Math.max(1, deadlineMs)); let attempted = false;
  return { async run(mode) {
    if (attempted) { emit('AI_ALREADY_ATTEMPTED'); return false; } attempted = true;
    if (!['--preflight', '--execute'].includes(mode)) { emit('AI_DISABLED'); return false; }
    try { await preflight(env, fetcher); } catch (e) { emit(['AI_CONTEXT_REJECTED', 'AI_APPROVAL_REQUIRED', 'AI_ENVIRONMENT_UNPROTECTED'].includes(e?.code) ? e.code : 'AI_PREFLIGHT_FAILED'); return false; }
    if (mode === '--preflight') { emit('AI_PREFLIGHT_OK'); return true; }
    const report = { execution: fetcher === fetch ? 'REAL_PROVIDER_REQUESTS' : 'SIMULATED_TEST_TRANSPORT', model: MODEL, productionReady: false, attempted: 0, failures: [], syntheticResults: [], baseline: benchmark.baseline() };
    const envelope = { version: 'recruitment-ai-eval-v1', source: fetcher === fetch ? 'operator_reported' : 'simulated', provider: 'cloudflare', model: MODEL, runs: [] };
    let neurons = 0, claimed = false;
    try {
      if (!/^[a-f0-9]{32}$/.test(env.CF_AI_EVAL_ACCOUNT_ID || '') || !/^[\x21-\x7e]{20,512}$/.test(env.CF_AI_EVAL_API_TOKEN || '')) throw deny('AI_CONFIG_INVALID');
      store.claim(); claimed = true;
      const plan = benchmark.exportCases(); if (plan.cases.length !== 12 || plan.repeats !== 3 || !report.baseline.cases.every(c => c.matchesExpected)) throw deny('AI_OUTPUT_REJECTED');
      const fixtureMap = new Map(benchmark.fixtures.map(f => [f.id, f]));
      for (const item of plan.cases) for (let repeat = 1; repeat <= 3; repeat++) {
        if (report.attempted >= 36 || neurons + 167.1552 > 6100) throw deny('AI_QUOTA_BOUND');
        report.attempted++; const started = performance.now();
        const result = await request('https://api.cloudflare.com/client/v4/accounts/' + env.CF_AI_EVAL_ACCOUNT_ID + '/ai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + env.CF_AI_EVAL_API_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(bodyFor(item, plan.schema)) }, fetcher, 32768, deadline);
        if (result.status !== 200) throw deny([401, 403].includes(result.status) ? 'AI_AUTH_DENIED' : result.status === 429 ? 'AI_RATE_LIMITED' : result.status === 400 ? 'AI_REQUEST_REJECTED' : 'AI_PROVIDER_FAILED');
        const serialized = JSON.stringify(result.data);
        if ([env.CF_AI_EVAL_ACCOUNT_ID, env.CF_AI_EVAL_API_TOKEN, env.GH_TOKEN].some(secret => serialized.includes(secret))) throw deny('AI_RESPONSE_INVALID');
        const choice = result.data.choices?.[0];
        if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string') throw deny('AI_OUTPUT_REJECTED');
        let output; try { output = JSON.parse(choice.message.content); benchmark.validateOutput(output, fixtureMap.get(item.caseId)); } catch { throw deny('AI_OUTPUT_REJECTED'); }
        const usage = result.data.usage, reasoning = usage?.completion_tokens_details?.reasoning_tokens ?? 0;
        if (!Number.isInteger(usage?.prompt_tokens) || usage.prompt_tokens < 0 || usage.prompt_tokens > 32768 || !Number.isInteger(usage?.completion_tokens) || usage.completion_tokens < 0 || usage.completion_tokens > 512 || !Number.isInteger(reasoning) || reasoning < 0 || reasoning > usage.completion_tokens) throw deny('AI_USAGE_UNVERIFIED');
        neurons += (usage.prompt_tokens * 4625 + usage.completion_tokens * 30475) / 1e6;
        envelope.runs.push({ caseId: item.caseId, repeat, latencyMs: performance.now() - started, inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, output });
        if (Buffer.byteLength(JSON.stringify(envelope)) > benchmark.MAX_BYTES) throw deny('AI_RESPONSE_INVALID');
        emit('AI_CASE_VALID'); // No response, account, credential or header logging.
      }
    } catch (e) { const code = CODES.has(e?.code) ? e.code : 'AI_PROVIDER_FAILED'; report.failures.push({ attempt: report.attempted, code }); emit(code); }
    report.syntheticResults = envelope.runs;
    report.assessment = envelope.runs.length ? benchmark.evaluate(envelope) : null;
    report.reportedNeurons = neurons; // Validated responses only; failed/aborted calls may also be billed.
    report.usageComplete = report.failures.length === 0;
    report.billingUsageVerified = false;
    report.complete = report.attempted === 36 && envelope.runs.length === 36 && !report.failures.length;
    report.semanticErrors = report.assessment ? report.assessment.cases.filter(c => !c.relationCorrect || !c.evidenceCorrect).length : null;
    if (claimed) { try { store.save(report); } catch { emit('AI_REPORT_FAILED'); return false; } }
    const ok = report.complete && report.semanticErrors === 0;
    emit(ok ? 'AI_SYNTHETIC_QA_COMPLETE' : 'AI_SYNTHETIC_QA_FAILED'); return ok;
  } };
}
if (require.main === module) { const args = process.argv.slice(2); createRunner().run(args.length === 1 ? args[0] : '').then(ok => { process.exitCode = ok ? 0 : 1; }).catch(() => { console.log('AI_SYNTHETIC_QA_FAILED'); process.exitCode = 1; }); }
module.exports = { createRunner, context, bodyFor, preflight, MODEL, ENVIRONMENT, APPROVAL, GATES };
