const crypto = require('node:crypto');
const VERSION = 'ats-v2';
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\u0307/g, '').replace(/\s+/g, ' ').trim();
const aliases = new Map();
for (const names of [
  ['cash handling', 'kassa', 'касса', 'cashier operations'], ['food safety', 'qida təhlükəsizliyi', 'пищевая безопасность'],
  ['customer service', 'müştəri xidməti', 'обслуживание клиентов'], ['shift management', 'növbə idarəetməsi', 'управление сменой'],
  ['kitchen operations', 'mətbəx əməliyyatları', 'работа на кухне'], ['team management', 'komanda idarəetməsi', 'управление командой'],
  ['haccp', 'hazard analysis and critical control points'], ['javascript', 'js'], ['typescript', 'ts'], ['node.js', 'nodejs'],
  ['secondary school', 'tam orta təhsil', 'среднее образование'], ['vocational education', 'peşə təhsili', 'профессиональное образование'],
]) for (const name of names) aliases.set(normalize(name), names[0]);
const canonical = value => { const valueNormalized = normalize(value); return aliases.get(valueNormalized) || valueNormalized; };
const list = values => [...new Set((Array.isArray(values) ? values : []).map(canonical).filter(Boolean))];
// Conservative lexical guard for explicit personal-trait criteria, not a universal fairness classifier.
const protectedCriterion = value => /(?:^|[^\p{L}\p{N}])(?:age|gender|sex|males?|females?|men|man|women|woman|young|elderly|nationality|ethnicity|race|religion|pregnan(?:t|cy)|disability|disabled|marital|under\s*\d+|over\s*\d+|yaş|yaşlı|gənc|cins|kişi(?:lər)?|qadın(?:lar)?|milliyyət|возраст|пол|мужчин(?:а|ы)?|женщин(?:а|ы)?|молод(?:ой|ая|ые)|пожил(?:ой|ая|ые)|национальность|раса|религия)(?:$|[^\p{L}\p{N}])/iu.test(normalize(value));
const roleAliases = new Map();
for (const names of [['cashier', 'kassir', 'кассир'], ['restaurant manager', 'restoran müdiri', 'менеджер ресторана'], ['cook', 'aşpaz', 'повар'], ['shift manager', 'növbə müdiri', 'менеджер смены']]) for (const name of names) roleAliases.set(normalize(name), names[0]);
const role = value => { const valueNormalized = normalize(value); return roleAliases.get(valueNormalized) || valueNormalized; };
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function candidateFacts(c) {
  return { role: role(c?.role), skills: list(c?.skills), experience: c?.experience ?? null,
    education: normalize(c?.education), certificates: list(c?.certificates), reviewedFields: [...(c?.reviewedFields || [])].sort(),
    reviewStatus: c?.cvReview?.reviewStatus || null,
    history: (c?.employmentHistory || []).map(h => ({ title: role(h.title), start: h.start ?? null, end: h.end ?? null, ongoing: h.ongoing === true })),
  };
}
function jobFacts(j) {
  return { role: role(j?.title), requiredSkills: list(j?.requiredSkills), preferredSkills: list(j?.preferredSkills),
    experienceYears: j?.experienceYears || 0, education: list(j?.requiredEducation), certificates: list(j?.requiredCertificates), weights: j?.criterionWeights || {} };
}
const jobFingerprint = j => hash(jobFacts(j));
const candidateFingerprint = c => hash(candidateFacts(c));
function fingerprints(j, c) { return { jobHash: jobFingerprint(j), candidateHash: candidateFingerprint(c) }; }
function relevantExperience(j, c, application, hashes) {
  const review = application?.matchingReview;
  if (review && review.jobHash === hashes.jobHash && review.candidateHash === hashes.candidateHash && Number.isFinite(review.relevantExperienceYears) && review.relevantExperienceYears >= 0)
    return { value: review.relevantExperienceYears, source: 'application.hr-review' };
  if (role(j.title) && role(j.title) === role(c.role) && typeof c.experience === 'number' && Number.isFinite(c.experience) && c.experience >= 0)
    return { value: c.experience, source: 'candidate.experience:matching-role' };
  const ranges = [];
  for (const h of c.employmentHistory || []) {
    if (role(h.title) !== role(j.title) || !h.start?.month || !h.end?.month) continue;
    const start = h.start.year * 12 + h.start.month - 1, end = h.end.year * 12 + h.end.month - 1;
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) ranges.push([start, end]);
  }
  if (!ranges.length) return { value: null, source: 'candidate.employmentHistory:unknown' };
  ranges.sort((a, b) => a[0] - b[0]); const merged = [];
  for (const r of ranges) { const last = merged.at(-1); if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]); }
  return { value: merged.reduce((sum, r) => sum + r[1] - r[0], 0) / 12, source: 'candidate.employmentHistory:dated-matching-role' };
}
function calculateApplicationMatch(job, candidate, { application } = {}) {
  const hashes = fingerprints(job, candidate), facts = jobFacts(job);
  const result = { version: VERSION, ...hashes, score: null, scoreStatus: 'pending', calculatedAt: new Date(), dataCoverage: 0, criteria: [], reason: 'requirements_missing' };
  if (!job?._id || !candidate?._id || !application || String(application.jobId) !== String(job?._id) || String(application.candidateId) !== String(candidate?._id)) return { ...result, reason: 'application_context_required' };
  if ([...facts.requiredSkills, ...facts.preferredSkills, ...facts.education, ...facts.certificates].some(protectedCriterion)) return { ...result, reason: 'protected_criteria_forbidden' };
  const known = (key, values) => values?.length > 0 || candidate.reviewedFields?.includes(key);
  const defaultWeights = { skills: .6, preferred: .15, experience: .25, education: .1, certificates: .1 };
  const addSkills = (key, needed, values, field) => {
    if (!needed.length) return; const have = list(values), matched = needed.filter(s => have.includes(s)), missing = needed.filter(s => !have.includes(s));
    result.criteria.push({ key, known: known(field, values), matched, missing, ratio: matched.length / needed.length, source: `candidate.${field}` });
  };
  addSkills('skills', facts.requiredSkills, candidate.skills, 'skills');
  addSkills('preferred', facts.preferredSkills, candidate.skills, 'skills');
  if (facts.experienceYears > 0) {
    const e = relevantExperience(job, candidate, application, hashes);
    result.criteria.push({ key: 'experience', known: e.value !== null, value: e.value, required: facts.experienceYears, ratio: e.value === null ? null : Math.min(e.value / facts.experienceYears, 1), source: e.source });
  }
  if (facts.education.length) {
    const education = canonical(candidate.education);
    const matched = facts.education.filter(e => education === e || normalize(candidate.education).includes(e));
    result.criteria.push({ key: 'education', known: known('education', candidate.education), matched, missing: facts.education.filter(e => !matched.includes(e)), ratio: matched.length / facts.education.length, source: 'candidate.education' });
  }
  addSkills('certificates', facts.certificates, candidate.certificates, 'certificates');
  const total = result.criteria.reduce((n, c) => n + (facts.weights[c.key] ?? defaultWeights[c.key]), 0);
  if (!total) return result;
  result.criteria = result.criteria.map(c => ({ ...c, weight: (facts.weights[c.key] ?? defaultWeights[c.key]) / total }));
  result.dataCoverage = Math.round(result.criteria.reduce((n, c) => n + (c.known ? c.weight : 0), 0) * 10000) / 10000;
  if (candidate.cvReview?.version && candidate.cvReview.reviewStatus !== 'confirmed') return { ...result, reason: 'hr_review_required' };
  if (result.criteria.some(c => c.weight > 0 && !c.known)) return { ...result, scoreStatus: 'incomplete', reason: 'facts_missing' };
  return { ...result, score: Math.max(0, Math.min(100, Math.round(result.criteria.reduce((n, c) => n + c.weight * (c.ratio || 0), 0) * 100))), scoreStatus: 'calculated', reason: null };
}
module.exports = { VERSION, canonical, jobFingerprint, candidateFingerprint, fingerprints, calculateApplicationMatch, protectedCriterion };
