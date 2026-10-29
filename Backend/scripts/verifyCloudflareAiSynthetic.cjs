// Manual synthetic QA only. Never imported by production routes/startup/providers.
const fs = require('node:fs'), path = require('node:path');
const benchmark = require('./evaluateRecruitmentAi.cjs');
const REPO = 'isgandarovusal/INOP', OWNER = 'isgandarovusal', BRANCH = 'refs/heads/inop-main';
const ENVIRONMENT = 'cf-ai-synthetic-evaluation', MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const APPROVAL = 'RUN UP TO 36 FICTIONAL AI REQUESTS', CANARY_APPROVAL = 'RUN ONE FICTIONAL AI CANARY';
const GATES = ['HR_CV_DURABLE_INTAKE_ENABLED', 'HR_CV_SCAN_ENABLED', 'HR_CV_INTAKE_WORKER_ENABLED', 'HR_CV_OCR_ENABLED', 'HR_CV_PROCESSING_ENABLED', 'HR_CV_AI_PROCESSING_ENABLED'];
const deny = code => Object.assign(Error('Synthetic evaluation unavailable.'), { code });
const CODES = new Set(['AI_REPORT_FAILED','AI_CONTEXT_REJECTED', 'AI_APPROVAL_REQUIRED', 'AI_ENVIRONMENT_UNPROTECTED', 'AI_PREFLIGHT_FAILED', 'AI_CONFIG_INVALID', 'AI_TIMEOUT', 'AI_RESPONSE_INVALID', 'AI_AUTH_DENIED', 'AI_RATE_LIMITED', 'AI_REQUEST_REJECTED', 'AI_PROVIDER_FAILED', 'AI_OUTPUT_REJECTED', 'AI_USAGE_UNVERIFIED', 'AI_QUOTA_BOUND', 'AI_ALREADY_ATTEMPTED']);
function context(env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REPOSITORY !== REPO || env.GITHUB_REF !== BRANCH || env.GITHUB_ACTOR !== OWNER || env.GITHUB_TRIGGERING_ACTOR !== OWNER || env.GITHUB_RUN_ATTEMPT !== '1' || !/^\d+$/.test(env.GITHUB_RUN_ID || '') || env.GITHUB_WORKFLOW_REF !== REPO + '/.github/workflows/cf-ai-synthetic-evaluation.yml@' + BRANCH) throw deny('AI_CONTEXT_REJECTED');
  if (env.CF_AI_SYNTHETIC_ENABLED !== 'true' || !['CANARY','BENCHMARK'].includes(env.CF_AI_MODE) || env.CF_AI_APPROVAL !== (env.CF_AI_MODE === 'CANARY' ? CANARY_APPROVAL : APPROVAL) || env.CF_AI_TRANSFER_APPROVED !== 'true' || (env.CF_AI_MODE === 'BENCHMARK' ? env.CF_AI_QUOTA_CONFIRMED !== 'true' : env.CF_AI_CANARY_APPROVED !== 'true') || !/^[a-f0-9]{40}$/.test(env.CF_AI_APPROVED_SHA || '') || env.CF_AI_APPROVED_SHA !== env.GITHUB_SHA || env.GITHUB_WORKFLOW_SHA !== env.GITHUB_SHA || GATES.some(k => env[k] !== 'false')) throw deny('AI_APPROVAL_REQUIRED');
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
// Defense in depth for JSON strings/keys and their bounded decoded forms.
// Publication never includes model prose, regardless of its encoding.
function assertNoReflections(value, secrets) {
  let nodes = 0;
  const visit = (item, depth = 0) => {
    if (++nodes > 4096 || depth > 16) throw deny('AI_RESPONSE_INVALID');
    if (typeof item === 'string') {
      if (secrets.some(secret => secret && (item.includes(secret) || item.normalize('NFKC').includes(secret)))) throw deny('AI_RESPONSE_INVALID');
      const decoded = item.replace(/\\u([a-f0-9]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\\\/g, '\\');
      if (decoded !== item) visit(decoded, depth + 1);
      let nested; try { if (/^[\s]*[\[{"]/.test(item)) nested = JSON.parse(item); } catch { /* Not nested JSON. No content is published. */ }
      if (nested !== undefined && nested !== item) visit(nested, depth + 1);
    } else if (Array.isArray(item)) for (const child of item) visit(child, depth + 1);
    else if (item && typeof item === 'object') for (const [key, child] of Object.entries(item)) { visit(key, depth + 1); visit(child, depth + 1); }
  };
  visit(value);
}
function publicArtifact(report) {
  const assessment = report.assessment;
  return {
    version: 'cf-ai-synthetic-metrics-v1', model: MODEL, execution: report.execution,
    productionReady: false, complete: true, attempted: report.attempted,
    explanationQuality: 'NOT_PUBLISHED_NOT_ASSESSED', billingUsageVerified: false,
    cases: assessment.cases.map(c => ({ caseId: c.caseId, repeat: c.repeat, verdict: c.verdict, schemaValid: c.schemaValid, relationCorrect: c.relationCorrect, evidenceCorrect: c.evidenceCorrect, latencyMs: c.latencyMs, inputTokens: c.inputTokens, outputTokens: c.outputTokens })),
    baseline: report.baseline.cases.map(c => ({ caseId: c.caseId, score: c.score, status: c.status })),
  };
}
function serializeArtifact(artifact, secrets) {
  const only = (o, keys) => o && !Array.isArray(o) && typeof o === 'object' && Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
  const number = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
  const fixtures = new Map(benchmark.fixtures.map(f => [f.id, f])), seen = new Set();
  if (artifact?.version === 'cf-ai-single-canary-v1') {
    if (!only(artifact, ['version','mode','model','execution','productionReady','attempted','authentication','modelAccepted','httpCategory','schemaValid','withinDeadline','latencyMs','benchmarkCompleted','quotaRemaining']) || artifact.mode !== 'CANARY' || artifact.model !== MODEL || !['REAL_PROVIDER_REQUESTS','SIMULATED_TEST_TRANSPORT'].includes(artifact.execution) || artifact.productionReady !== false || artifact.attempted !== 1 || artifact.authentication !== 'CONFIRMED' || artifact.modelAccepted !== true || artifact.httpCategory !== '2XX' || artifact.schemaValid !== true || artifact.withinDeadline !== true || !number(artifact.latencyMs, 8000) || artifact.benchmarkCompleted !== false || artifact.quotaRemaining !== 'UNKNOWN') throw deny('AI_RESPONSE_INVALID');
    assertNoReflections(artifact, secrets);
    const text = JSON.stringify(artifact, null, 2); assertNoReflections(text, secrets); return text;
  }
  if (!only(artifact, ['version','model','execution','productionReady','complete','attempted','explanationQuality','billingUsageVerified','cases','baseline']) || artifact.version !== 'cf-ai-synthetic-metrics-v1' || artifact.model !== MODEL || !['REAL_PROVIDER_REQUESTS','SIMULATED_TEST_TRANSPORT'].includes(artifact.execution) || artifact.productionReady !== false || artifact.complete !== true || artifact.attempted !== 36 || artifact.explanationQuality !== 'NOT_PUBLISHED_NOT_ASSESSED' || artifact.billingUsageVerified !== false || !Array.isArray(artifact.cases) || artifact.cases.length !== 36 || !Array.isArray(artifact.baseline) || artifact.baseline.length !== 12) throw deny('AI_RESPONSE_INVALID');
  for (const row of artifact.cases) {
    const f = fixtures.get(row?.caseId), key = row?.caseId + ':' + row?.repeat;
    if (!only(row, ['caseId','repeat','verdict','schemaValid','relationCorrect','evidenceCorrect','latencyMs','inputTokens','outputTokens']) || !f || !Number.isInteger(row.repeat) || row.repeat < 1 || row.repeat > 3 || seen.has(key) || !['supported','missing','unknown','contradicted'].includes(row.verdict) || row.schemaValid !== true || row.relationCorrect !== true || row.evidenceCorrect !== true || !number(row.latencyMs, 300000) || !Number.isInteger(row.inputTokens) || !number(row.inputTokens, 32768) || !Number.isInteger(row.outputTokens) || !number(row.outputTokens, 512)) throw deny('AI_RESPONSE_INVALID');
    seen.add(key);
  }
  seen.clear();
  for (const row of artifact.baseline) {
    const f = fixtures.get(row?.caseId);
    if (!only(row, ['caseId','score','status']) || !f || seen.has(row.caseId) || row.score !== f.gold.atsScore || row.status !== f.gold.atsStatus) throw deny('AI_RESPONSE_INVALID');
    seen.add(row.caseId);
  }
  assertNoReflections(artifact, secrets);
  const text = JSON.stringify(artifact, null, 2);
  if (Buffer.byteLength(text) > 32768) throw deny('AI_RESPONSE_INVALID');
  assertNoReflections(text, secrets);
  return text;
}
async function evaluateOne(item, schema, fixture, env, fetcher, deadline, secrets, emitStatus = () => {}) {
  const started = performance.now();
  const result = await request('https://api.cloudflare.com/client/v4/accounts/' + env.CF_AI_EVAL_ACCOUNT_ID + '/ai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + env.CF_AI_EVAL_API_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(bodyFor(item, schema)) }, fetcher, 32768, deadline);
  emitStatus(result.status === 200 ? 'AI_CANARY_HTTP_2XX' : result.status >= 400 && result.status < 500 ? 'AI_CANARY_HTTP_4XX' : result.status >= 500 && result.status < 600 ? 'AI_CANARY_HTTP_5XX' : 'AI_CANARY_HTTP_OTHER');
  if (result.status !== 200) throw deny([401, 403].includes(result.status) ? 'AI_AUTH_DENIED' : result.status === 429 ? 'AI_RATE_LIMITED' : result.status === 400 ? 'AI_REQUEST_REJECTED' : 'AI_PROVIDER_FAILED');
  emitStatus('AI_CANARY_AUTH_CONFIRMED'); emitStatus('AI_CANARY_MODEL_ACCEPTED');
  assertNoReflections(result.data, secrets);
  const choice = result.data.choices?.[0];
  if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string') { emitStatus('AI_CANARY_SCHEMA_INVALID'); throw deny('AI_OUTPUT_REJECTED'); }
  let output; try { output = JSON.parse(choice.message.content); assertNoReflections(output, secrets); benchmark.validateOutput(output, fixture); } catch { emitStatus('AI_CANARY_SCHEMA_INVALID'); throw deny('AI_OUTPUT_REJECTED'); }
  emitStatus('AI_CANARY_SCHEMA_VALID');
  const usage = result.data.usage, reasoning = usage?.completion_tokens_details?.reasoning_tokens ?? 0;
  if (!Number.isInteger(usage?.prompt_tokens) || usage.prompt_tokens < 0 || usage.prompt_tokens > 32768 || !Number.isInteger(usage?.completion_tokens) || usage.completion_tokens < 0 || usage.completion_tokens > 512 || !Number.isInteger(reasoning) || reasoning < 0 || reasoning > usage.completion_tokens) throw deny('AI_USAGE_UNVERIFIED');
  const latencyMs = performance.now() - started;
  if (latencyMs > deadline) throw deny('AI_TIMEOUT');
  emitStatus('AI_CANARY_WITHIN_DEADLINE');
  return { output, usage, latencyMs };
}
function outputStore() {
  const dir = path.resolve('work/cf-ai-synthetic');
  return {
    claim() { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); try { fs.closeSync(fs.openSync(path.join(dir, '.attempt'), 'wx', 0o600)); } catch { throw deny('AI_ALREADY_ATTEMPTED'); } },
    save(text) {
      const temp = path.join(dir, 'report.tmp');
      fs.writeFileSync(temp, text, { flag: 'wx', mode: 0o600 });
      fs.renameSync(temp, path.join(dir, 'report.json'));
    },
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
    const secrets = [env.CF_AI_EVAL_ACCOUNT_ID, env.CF_AI_EVAL_API_TOKEN, env.GH_TOKEN].filter(Boolean);
    let neurons = 0, claimed = false;
    try {
      if (!/^[a-f0-9]{32}$/.test(env.CF_AI_EVAL_ACCOUNT_ID || '') || !/^[\x21-\x7e]{20,512}$/.test(env.CF_AI_EVAL_API_TOKEN || '')) throw deny('AI_CONFIG_INVALID');
      store.claim(); claimed = true;
      const plan = benchmark.exportCases(); if (plan.cases.length !== 12 || plan.repeats !== 3 || !report.baseline.cases.every(c => c.matchesExpected)) throw deny('AI_OUTPUT_REJECTED');
      const fixtureMap = new Map(benchmark.fixtures.map(f => [f.id, f]));
      if (env.CF_AI_MODE === 'CANARY') {
        // A separate return boundary: success and every failure stop before the batch loop.
        try {
          const item = plan.cases[0]; report.attempted = 1;
          const result = await evaluateOne(item, plan.schema, fixtureMap.get(item.caseId), env, fetcher, deadline, secrets, emit);
          const artifact = { version: 'cf-ai-single-canary-v1', mode: 'CANARY', model: MODEL, execution: report.execution, productionReady: false, attempted: 1, authentication: 'CONFIRMED', modelAccepted: true, httpCategory: '2XX', schemaValid: true, withinDeadline: true, latencyMs: result.latencyMs, benchmarkCompleted: false, quotaRemaining: 'UNKNOWN' };
          try { store.save(serializeArtifact(artifact, secrets)); } catch { throw deny('AI_REPORT_FAILED'); }
          emit('AI_CANARY_COMPLETE'); return true;
        } catch (e) { emit(CODES.has(e?.code) ? e.code : 'AI_PROVIDER_FAILED'); emit('AI_CANARY_FAILED'); return false; }
      }
      for (const item of plan.cases) for (let repeat = 1; repeat <= 3; repeat++) {
        if (report.attempted >= 36 || neurons + 167.1552 > 6100) throw deny('AI_QUOTA_BOUND');
        report.attempted++;
        const { output, usage, latencyMs } = await evaluateOne(item, plan.schema, fixtureMap.get(item.caseId), env, fetcher, deadline, secrets);
        neurons += (usage.prompt_tokens * 4625 + usage.completion_tokens * 30475) / 1e6;
        envelope.runs.push({ caseId: item.caseId, repeat, latencyMs, inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, output });
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
    const ok = report.complete && report.semanticErrors === 0;
    if (!ok || !claimed) { if (report.complete && report.semanticErrors > 0) emit('AI_SEMANTIC_MISMATCH'); emit('AI_SYNTHETIC_QA_FAILED'); return false; }
    try { store.save(serializeArtifact(publicArtifact(report), secrets)); } catch { emit('AI_REPORT_FAILED'); return false; }
    emit('AI_SYNTHETIC_QA_COMPLETE'); return true;
  } };
}
if (require.main === module) { const args = process.argv.slice(2); createRunner().run(args.length === 1 ? args[0] : '').then(ok => { if (ok && args[0] === '--execute') fs.appendFileSync(process.env.GITHUB_OUTPUT, 'artifact_safe=true\n'); process.exitCode = ok ? 0 : 1; }).catch(() => { console.log('AI_SYNTHETIC_QA_FAILED'); process.exitCode = 1; }); }
module.exports = { createRunner, context, bodyFor, preflight, MODEL, ENVIRONMENT, APPROVAL, CANARY_APPROVAL, GATES, assertNoReflections, serializeArtifact };
