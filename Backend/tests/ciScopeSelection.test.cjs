const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { classify, detect, readPlan, runBrowser, groups } = require('../../scripts/qaScope.cjs');
const change = (p, status = 'M') => ({ path: p, status });
const page = 'Frontend/src/Pages/Recruitment/Candidates/CandidatesList.tsx';
const localePath = 'Frontend/src/i18n/locales/az.json';
const scope = changes => classify(changes).scope;

test('only explicit Recruitment paths choose the smaller browser suite', () => {
  assert.equal(scope([change(page)]), 'recruitment-frontend');
  assert.equal(scope([change('Backend/controllers/hrPaged.controller.js')]), 'full');
  assert.equal(scope([change(page), change('Backend/services/applicationMatch.service.js')]), 'full');
  assert.equal(scope([change('Frontend/tests/applicationMatchingUI.test.cjs')]), 'recruitment-frontend');
  for (const p of ['Frontend/src/Pages/Audit/Audit.tsx', 'Backend/controllers/audit.controller.js',
    'Frontend/src/Components/MatchScoreBadge.tsx', 'Frontend/src/Context/AuthContext.tsx',
    'Backend/controllers/hrPaged.controller.js', 'Backend/services/recruitmentCatalog.service.js', 'Backend/services/applicationMatch.service.js',
    'Frontend/src/Services/applicationsService.ts', 'Frontend/src/Services/hrPageService.ts', 'Backend/middleware/auth.middleware.js', 'Backend/services/hrResourceScope.service.js',
    'Backend/services/hrClamScan.service.js', 'Backend/routes/route.js', 'Frontend/src/Styles/recruitment.css',
    'Backend/package.json', 'Frontend/package-lock.json', '.github/workflows/audit-release-gate.yml',
    'scripts/qaScope.cjs', 'docs/unknown.md', 'Frontend/src/Pages/Recruitment/NewFeature.tsx']) {
    assert.equal(scope([change(p)]), 'full', p);
    assert.equal(scope([change(page), change(p)]), 'full', 'mixed ' + p);
  }
  assert.equal(scope([]), 'full');
  for (const status of ['D', 'R100', 'C100', 'T', '?']) assert.equal(scope([change(page, status)]), 'full');
});

test('locale scope compares every changed leaf and fails full for shared, removed, malformed and missing content', () => {
  const before = { hrWorkflow: { timezoneHelp: 'old' }, shared: { save: 'Save' } };
  const after = { hrWorkflow: { timezoneHelp: 'new' }, shared: { save: 'Save' } };
  assert.equal(classify([change(localePath)], () => [before, after]).scope, 'recruitment-frontend');
  assert.equal(classify([change(localePath)], () => [{}, { hrCandidateFilters: { title: 'New' } }]).scope, 'recruitment-frontend');
  for (const value of [{ ...after, shared: { save: 'Changed' } }, { shared: before.shared },
    { ...after, hrWorkflow: { timezoneHelp: 7 } }, { ...after, unknownRoot: { text: 'new' } }]) {
    assert.equal(classify([change(localePath)], () => [before, value]).scope, 'full');
  }
  assert.equal(classify([change(localePath)], () => { throw Error('missing'); }).scope, 'full');
  assert.equal(classify([change(localePath, 'A')], () => [before, after]).scope, 'full');
  for (const key of ['__proto__', 'constructor', 'prototype']) assert.equal(classify([change(localePath)], () => [{}, JSON.parse('{"hrMatch":{"' + key + '":"unsafe"}}')]).scope, 'full');
});

function fixture(fn) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'inop-ci-scope-'));
  const git = (...args) => { const r = spawnSync('git', args, { cwd, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  const write = (p, content) => { fs.mkdirSync(path.dirname(path.join(cwd, p)), { recursive: true }); fs.writeFileSync(path.join(cwd, p), content); };
  const commit = () => { git('add', '.'); git('commit', '-qm', 'synthetic'); return git('rev-parse', 'HEAD'); };
  try {
    git('init', '-q', '-b', 'main'); git('config', 'user.name', 'Synthetic QA'); git('config', 'user.email', 'qa@example.invalid');
    write(page, 'baseline'); write(localePath, JSON.stringify({ hrWorkflow: { timezoneHelp: 'old' } })); const base = commit();
    fn({ cwd, git, write, commit, base });
  } finally { fs.rmSync(cwd, { recursive: true, force: false }); }
}

test('real git ranges include every commit, including an earlier shared change', () => fixture(({ cwd, write, commit, base }) => {
  write('Frontend/src/Components/Shared.tsx', 'shared'); commit();
  write(page, 'Recruitment final commit'); const after = commit();
  assert.equal(detect({ cwd, eventName: 'push', event: { before: base, after }, sha: after }).scope, 'full');
}));

test('real multi-commit Recruitment and PR merge range choose Recruitment, not just the latest commit', () => fixture(({ cwd, write, commit, base, git }) => {
  write(page, 'first change'); commit(); write(localePath, JSON.stringify({ hrWorkflow: { timezoneHelp: 'second change' } })); const after = commit();
  assert.equal(detect({ cwd, eventName: 'push', event: { before: base, after }, sha: after }).scope, 'recruitment-frontend');
  assert.equal(detect({ cwd, eventName: 'pull_request', event: { pull_request: { base: { sha: base } } }, sha: after }).scope, 'recruitment-frontend');
  git('checkout', '-qb', 'synthetic-head', base); write('Frontend/src/Pages/Recruitment/Applications/ApplicationDetail.tsx', 'fork change'); commit(); git('checkout', '-q', 'main');
  git('merge', '--no-ff', '-m', 'synthetic merge', 'synthetic-head'); const merged = git('rev-parse', 'HEAD');
  assert.equal(detect({ cwd, eventName: 'pull_request', event: { pull_request: { base: { sha: base } } }, sha: merged }).scope, 'recruitment-frontend');
}));

test('real rename including old path, deletion, malformed locale, missing base and checkout mismatch all choose full', () => {
  fixture(({ cwd, git, commit, base }) => {
    git('mv', page, 'Frontend/src/Pages/Recruitment/Candidates/CandidateDetail.tsx'); const after = commit();
    assert.equal(detect({ cwd, eventName: 'push', event: { before: base, after }, sha: after }).scope, 'full');
  });
  fixture(({ cwd, git, commit, base, write }) => {
    git('rm', page); let after = commit();
    assert.equal(detect({ cwd, eventName: 'push', event: { before: base, after }, sha: after }).scope, 'full');
    write(localePath, '{bad JSON'); after = commit();
    assert.equal(detect({ cwd, eventName: 'push', event: { before: base, after }, sha: after }).scope, 'full');
    for (const bad of [{ before: 'a'.repeat(40), after }, { before: '0'.repeat(40), after }, { before: base, after: base }]) {
      assert.equal(detect({ cwd, eventName: 'push', event: bad, sha: after }).scope, 'full');
    }
    assert.equal(detect({ cwd, eventName: 'pull_request', event: {}, sha: after }).scope, 'full');
  });
});

test('manual, schedule and unknown events cannot select reduced coverage', () => {
  for (const eventName of ['workflow_dispatch', 'schedule', 'unknown']) assert.equal(detect({ eventName, event: {} }).scope, 'full');
});

test('missing, malformed, stale or incomplete plans choose executable full fallback', () => fixture(({ cwd, base, write }) => {
  const file = path.join(cwd, 'plan.json');
  assert.equal(readPlan(file, cwd).scope, 'full');
  for (const body of ['{', '{}', JSON.stringify({ version: 1, scope: 'skip' }), JSON.stringify({ version: 1, scope: 'recruitment-frontend', head: base })]) {
    fs.writeFileSync(file, body); assert.equal(readPlan(file, cwd).scope, 'full');
  }
  for (const g of groups) for (const name of g.files) write('Frontend/tests/' + name, '// fixture');
  fs.writeFileSync(file, JSON.stringify({ version: 1, scope: 'recruitment-frontend', head: base })); assert.equal(readPlan(file, cwd).scope, 'recruitment-frontend');
}));

test('selected and full runners propagate every failure and never turn later passes into success', () => {
  const previous = process.env.INOP_AUDIT_TEST_PORT; process.env.INOP_AUDIT_TEST_PORT = '27018';
  try {
    let calls = [];
    assert.equal(runBrowser({ scope: 'full' }, { spawn: (_exe, args) => { calls.push(args); return { status: 9 }; } }), 9);
    assert.deepEqual(calls, [['Frontend/tests/runAuditBrowserSuite.cjs']]);
    calls = [];
    assert.equal(runBrowser({ scope: 'recruitment-frontend' }, { spawn: (_exe, args) => { calls.push(args); return { status: calls.length === 1 ? 1 : 0 }; } }), 1);
    assert.equal(calls.length, groups.length);
    assert.ok(calls.every(args => args.includes('--test-isolation=none')));
    assert.equal(runBrowser({ scope: 'recruitment-frontend' }, { spawn: () => ({ status: 0 }) }), 0);
    assert.equal(runBrowser({ scope: 'invalid' }, { spawn: () => ({ status: null, signal: 'SIGTERM' }) }), 1);
    assert.equal(runBrowser({ scope: 'recruitment-frontend' }, { spawn: () => ({ status: null, error: Error('synthetic') }) }), 1);
  } finally { if (previous === undefined) delete process.env.INOP_AUDIT_TEST_PORT; else process.env.INOP_AUDIT_TEST_PORT = previous; }
});

test('workflow keeps required identity/security/backend gate and always full manual/schedule capability', () => {
  const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/audit-release-gate.yml'), 'utf8');
  assert.match(workflow, /^name: Audit local release gate/m); assert.match(workflow, /^  local-qa:/m);
  assert.match(workflow, /cancel-in-progress: false/); assert.match(workflow, /timeout-minutes: 60/);
  assert.match(workflow, /workflow_dispatch:/); assert.match(workflow, /schedule:/); assert.ok(!workflow.includes('paths-ignore:'));
  assert.match(workflow, /npm test --prefix Backend/); assert.match(workflow, /--omit=dev/); assert.match(workflow, /for package in Backend Frontend/);
  assert.match(workflow, /scope":"full"/); assert.match(workflow, /node scripts\/qaScope\.cjs browser/);
  assert.ok(!workflow.includes('continue-on-error:')); assert.match(workflow, /fetch-depth: 0/);
});
