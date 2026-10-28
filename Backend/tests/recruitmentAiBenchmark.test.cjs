const test = require('node:test'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const bench = require('../scripts/evaluateRecruitmentAi.cjs');
const output = fixture => ({ criteria: [{ requirementId: 'r1', relation: fixture.gold.relation, evidenceIds: [...fixture.gold.evidenceIds], explanation: 'Synthetic professional evidence requires HR review.' }] });
const envelope = (source = 'simulated') => ({ version: 'recruitment-ai-eval-v1', source, provider: 'synthetic', model: 'test-only', runs: bench.fixtures.flatMap(f => [1, 2, 3].map(repeat => ({ caseId: f.id, repeat, latencyMs: null, inputTokens: null, outputTokens: null, output: output(f) }))) });

test('Actual ATS-v2 executes twelve fixed AZ/EN/RU cases without new scoring rules', () => {
  const result = bench.baseline();
  assert.equal(result.execution, 'ACTUAL_LOCAL_ATS_V2'); assert.equal(result.aiExecution, 'NOT_RUN');
  assert.equal(result.cases.length, 12); assert.ok(result.cases.every(c => c.matchesExpected));
  for (const locale of ['az', 'en', 'ru']) {
    const rows = result.cases.filter(c => c.locale === locale);
    assert.deepEqual(rows.map(c => c.score), [100, 0, null, 0]);
    assert.equal(rows[2].status, 'incomplete');
  }
});
test('Export uses existing bounded professional evidence and never exports gold labels or candidate identities', () => {
  const exported = bench.exportCases();
  assert.equal(exported.repeats, 3); assert.equal(exported.cases.length, 12);
  const text = JSON.stringify(exported);
  for (const forbidden of ['atsScore', 'gold', '111111111111111111111111', '222222222222222222222222', 'sha256', 'cvOriginal']) assert.ok(!text.includes(forbidden));
  assert.ok(exported.cases.every(c => c.input.evidence.facts.length <= 24));
});
test('Simulated gold responses exercise validators, never count as model evidence', () => {
  const result = bench.evaluate(envelope());
  assert.equal(result.execution, 'SIMULATED_NOT_MODEL_EVIDENCE'); assert.equal(result.productionReady, false); assert.equal(result.complete, true);
  assert.ok(result.cases.every(c => c.schemaValid && c.relationCorrect && c.evidenceCorrect));
  assert.ok(result.consistency.every(c => c.consistent === true));
  assert.equal(result.explanationQuality, 'MANUAL_REVIEW_REQUIRED');
  assert.equal(result.summary.schemaValid, 36); assert.deepEqual(result.summary.reportedLatency, { samples: 0, p50Ms: null, p95Ms: null });
});
test('Imported provider evidence is explicitly unverified and incomplete repeats are not consistent', () => {
  const input = envelope('operator_reported'); input.runs = input.runs.slice(0, 1);
  const result = bench.evaluate(input);
  assert.equal(result.execution, 'OPERATOR_REPORTED_NOT_INDEPENDENTLY_VERIFIED'); assert.equal(result.complete, false);
  assert.equal(result.consistency[0].consistent, null); assert.equal(result.cases[0].latencyMs, null);
});
for (const [name, mutate] of [
  ['invented evidence', row => row.evidenceIds = ['e99']], ['extra score', row => row.score = 75],
  ['hiring decision', row => row.hire = true], ['missing explanation', row => delete row.explanation],
  ['unproven support', row => row.evidenceIds = []], ['duplicate evidence', row => row.evidenceIds = ['e1', 'e1']],
  ['wrong requirement', row => row.requirementId = 'r2'], ['unsafe content', row => row.explanation = 'token=DO_NOT_LOG'],
]) test(`Rejects ${name} without reflecting output`, () => {
  const input = envelope(); mutate(input.runs[0].output.criteria[0]);
  const result = bench.evaluate(input);
  assert.equal(result.cases[0].schemaValid, false);
  assert.equal(result.cases[0].code, 'BENCHMARK_OUTPUT_REJECTED');
  assert.ok(!JSON.stringify(result).includes('DO_NOT_LOG'));
});
test('Schema-valid hallucinations and injected instructions are measured as errors, not accepted as truth', () => {
  const input = envelope();
  const row = input.runs.find(r => r.caseId === 'az-negative-injection');
  row.output.criteria[0].relation = 'supported'; row.output.criteria[0].evidenceIds = ['e2'];
  const result = bench.evaluate(input), bad = result.cases.find(r => r.caseId === row.caseId);
  assert.equal(bad.schemaValid, true); assert.equal(bad.relationCorrect, false); assert.equal(bad.evidenceCorrect, false);
  assert.equal(result.consistency.find(r => r.caseId === row.caseId).consistent, false);
});
test('Unknown qualifications cannot acquire fabricated evidence', () => {
  const f = bench.fixtures.find(f => f.id === 'en-unknown'), result = output(f);
  result.criteria[0].evidenceIds = ['e1']; assert.throws(() => bench.validateOutput(result, f));
});
test('Duplicate/unbounded runs, invalid timing and untrusted provenance fail closed', () => {
  for (const mutate of [
    input => input.runs.push(input.runs[0]), input => input.runs[0].latencyMs = -1,
    input => input.runs[0].repeat = 4, input => input.source = 'verified',
    input => input.runs[0].output.padding = 'x'.repeat(bench.MAX_BYTES),
  ]) { const input = envelope(); mutate(input); assert.throws(() => bench.evaluate(input)); }
});
test('CLI has no network mode and reports only sanitized input failures', () => {
  const script = path.resolve(__dirname, '../scripts/evaluateRecruitmentAi.cjs');
  const denied = spawnSync(process.execPath, [script, '--live', 'DO_NOT_LOG'], { encoding: 'utf8' });
  assert.equal(denied.status, 1); assert.equal(denied.stderr.trim(), 'BENCHMARK_INPUT_INVALID'); assert.equal(denied.stdout, '');
  const baseline = spawnSync(process.execPath, [script, '--baseline'], { encoding: 'utf8' });
  assert.equal(baseline.status, 0); assert.equal(JSON.parse(baseline.stdout).aiExecution, 'NOT_RUN');
});

test('Reported latency percentiles exclude unknown measurements and never simulate model timing', () => {
  const input = envelope('operator_reported'); input.runs = input.runs.slice(0, 3);
  input.runs[0].latencyMs = 100; input.runs[1].latencyMs = 300;
  assert.deepEqual(bench.evaluate(input).summary.reportedLatency, { samples: 2, p50Ms: 100, p95Ms: 300 });
});
