const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const frontend = new Set([
  'Analytics/HRAnalytics.tsx', 'Applications/ApplicationDetail.tsx', 'Applications/ApplicationsList.tsx',
  'Candidates/CandidateDetail.tsx', 'Candidates/CandidateForm.tsx', 'Candidates/CandidatesList.tsx',
  'Candidates/CvIntakeDetail.tsx', 'Candidates/CvIntakeQueue.tsx', 'Jobs/JobDetail.tsx', 'Jobs/JobForm.tsx', 'Jobs/JobsList.tsx',
].map(p => 'Frontend/src/Pages/Recruitment/' + p));
// Backend queries, scoring/fairness and service decoders remain conservative full.
const localeRoots = new Set(['hrCandidateFilters', 'hrWorkflow', 'hrMatch', 'hrHandoff', 'hrDelivery']);
const groups = [
  { files: ['loginIntakeReadiness.test.cjs', 'recruitmentWorkspaceUI.test.cjs', 'cvUniversalImportUI.test.cjs', 'recruitmentRoutesRealAuth.test.cjs'] },
  { files: ['cvIntakeUI.test.cjs', 'cvIntakeQueueUI.test.cjs', 'cvIntakeSourceReviewUI.test.cjs', 'cvIntakeRepairUI.test.cjs', 'cvIntakeOcrUI.test.cjs'] },
  { files: ['applicationWorkflowKey.test.cjs', 'applicationLifecycleUI.test.cjs', 'applicationHandoffContextUI.test.cjs'] },
  { files: ['applicationMatchingUI.test.cjs', 'recruitmentProductUI.test.cjs', 'opensourceCapabilityUI.test.cjs','productStabilizationUI.test.cjs','dashboardSnapshotProperty.test.cjs', 'candidateActions.test.cjs', 'hrCandidateArchiveUI.test.cjs', 'hrJobArchiveUI.test.cjs', 'recruitmentCatalogUI.test.cjs', 'hrLifecycle.test.cjs'] },
  { files: ['hrPaginationUI.test.cjs', 'hrRankingUI.test.cjs', 'hrAnalyticsUI.test.cjs', 'hrDepartmentAccessUI.test.cjs', 'hrNavigationPerformance.test.cjs'] },
  { files: ['hrContracts.test.cjs', 'hrBoardCode.test.cjs', 'requestLifecycle.test.cjs', 'authRefresh.test.cjs', 'authFocusCoalescing.test.cjs'] },
  // The historical premium screenshot root writes to an operator-owned absolute
  // directory. This is the portable filter acceptance, not an original full-gate
  // test skip: that file was not part of the existing fifteen full groups.
  { files: ['enterpriseCandidatesUI.test.cjs'], pattern: 'Structured Candidate filters' },
];
const tests = new Set(groups.flatMap(g => g.files).map(f => 'Frontend/tests/' + f));
const full = reason => ({ version: 1, scope: 'full', reason });
function changedLeaves(before, after, prefix = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!after || typeof after !== 'object' || Array.isArray(after) || (before !== undefined && (!before || typeof before !== 'object' || Array.isArray(before)))) return [prefix];
  before ??= {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => changedLeaves(before[key], after[key], [...prefix, key]));
}
function classify(changes, locale) {
  if (!Array.isArray(changes) || !changes.length) return full('NO_VERIFIABLE_CHANGES');
  for (const change of changes) {
    if (!change || !['M', 'A'].includes(change.status) || typeof change.path !== 'string') return full('UNSUPPORTED_CHANGE');
    if (frontend.has(change.path) || tests.has(change.path)) continue;
    if (/^Frontend\/src\/i18n\/locales\/(az|en|ru)\.json$/.test(change.path) && change.status === 'M') {
      try {
        const [before, after] = locale(change.path);
        const leaves = changedLeaves(before, after);
        if (!leaves.length || leaves.some(parts => parts.length < 2 || parts.some(key => ['__proto__', 'constructor', 'prototype'].includes(key)) || !localeRoots.has(parts[0]) ||
          typeof parts.reduce((value, key) => value?.[key], after) !== 'string')) return full('SHARED_OR_REMOVED_LOCALE');
        continue;
      } catch { return full('UNREADABLE_LOCALE'); }
    }
    return full('SHARED_SECURITY_OR_UNKNOWN_PATH');
  }
  return { version: 1, scope: 'recruitment-frontend', reason: 'REVIEWED_RECRUITMENT_PATHS' };
}
function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (r.status !== 0 || r.error) throw Error('GIT_UNAVAILABLE');
  return r.stdout;
}
function detect({ eventName, event, sha, cwd = root }) {
  if (['workflow_dispatch', 'schedule'].includes(eventName)) return full('EXPLICIT_FULL_RUN');
  try {
    if (!['push', 'pull_request'].includes(eventName)) return full('UNKNOWN_EVENT');
    const before = eventName === 'push' ? event.before : event.pull_request?.base?.sha;
    const after = eventName === 'push' ? event.after : sha;
    if (![before, after].every(s => typeof s === 'string' && /^[a-f0-9]{40}$/.test(s) && !/^0+$/.test(s)) || after !== sha) return full('INVALID_RANGE');
    if (git(cwd, ['rev-parse', 'HEAD']).trim() !== after) return full('CHECKOUT_MISMATCH');
    git(cwd, ['merge-base', '--is-ancestor', before, after]);
    const tokens = git(cwd, ['diff', '--name-status', '-z', '--find-renames', before, after, '--']).split('\0');
    if (tokens.pop() !== '') return full('INVALID_DIFF');
    const changes = [];
    while (tokens.length) {
      const status = tokens.shift(); const name = tokens.shift();
      if (!name || !['M', 'A'].includes(status)) return full('RENAMED_DELETED_OR_UNKNOWN_CHANGE');
      changes.push({ status, path: name });
    }
    const plan = classify(changes, file => [JSON.parse(git(cwd, ['show', before + ':' + file])), JSON.parse(git(cwd, ['show', after + ':' + file]))]);
    return { ...plan, head: after };
  } catch { return full('DETECTION_FAILED'); }
}
function readPlan(file, cwd = root) {
  try {
    const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (plan.version !== 1 || !['full', 'recruitment-frontend'].includes(plan.scope)) return full('INVALID_PLAN');
    if (plan.scope !== 'full' && (plan.head !== git(cwd, ['rev-parse', 'HEAD']).trim() || groups.some(g => g.files.some(f => !fs.existsSync(path.join(cwd, 'Frontend/tests', f)))))) return full('STALE_OR_INCOMPLETE_PLAN');
    return plan;
  } catch { return full('MISSING_PLAN'); }
}
async function runBrowser(plan, { cwd = root, spawn = require('./runQaProcess.cjs').runQaProcess } = {}) {
  if (process.env.INOP_AUDIT_TEST_PORT !== '27018') throw Error('Browser integration requires owned loopback QA port 27018.');
  if (plan?.scope !== 'recruitment-frontend') {
    const result = await spawn(process.execPath, ['Frontend/tests/runAuditBrowserSuite.cjs'], { cwd, env: process.env, stdio: 'inherit', timeoutMs:2400000 });
    return result.error || result.signal ? 1 : result.status ?? 1;
  }
  let failed = false;
  for (const [index, group] of groups.entries()) {
    const started = performance.now();
    console.log(JSON.stringify({ code: 'RECRUITMENT_QA_GROUP_START', group: index + 1, files: group.files }));
    const result = await spawn(process.execPath, ['--test', '--test-timeout=300000', '--test-isolation=none', ...(group.pattern ? ['--test-name-pattern=' + group.pattern] : []), ...group.files.map(f => 'Frontend/tests/' + f)], { cwd, env: process.env, stdio: 'inherit' });
    if (result.status !== 0 || result.error || result.signal) failed = true;
    console.log(JSON.stringify({ code: 'RECRUITMENT_QA_GROUP_RESULT', group: index + 1, status: result.status ?? null, signal: result.signal ?? null, elapsedMs: Math.round(performance.now() - started) }));
  }
  return failed ? 1 : 0;
}
module.exports = { classify, changedLeaves, detect, readPlan, runBrowser, groups };
if (require.main === module) {
  if (process.argv[2] === 'detect') {
    let plan;
    try { plan = detect({ eventName: process.env.GITHUB_EVENT_NAME, event: JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), sha: process.env.GITHUB_SHA }); }
    catch { plan = full('UNREADABLE_EVENT'); }
    console.log(JSON.stringify(plan));
  } else if (process.argv[2] === 'browser') runBrowser(readPlan(path.join(root, 'work/audit-ci/qa-scope.json'))).then(code=>{process.exitCode=code;}).catch(()=>{process.exitCode=1;});
  else { process.stderr.write('Expected detect or browser.\n'); process.exitCode = 1; }
}
