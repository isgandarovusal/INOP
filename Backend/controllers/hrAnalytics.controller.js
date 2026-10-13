const mongoose = require('mongoose');
const Application = require('../models/application.model');
const Job = require('../models/job.model');
const Candidate = require('../models/candidate.model');
const Branch = require('../models/recruitmentBranch.model');
const { aggregateResourceFilter, resourceFilter } = require('../services/hrResourceScope.service');
const { jobFingerprint, candidateFingerprint, VERSION } = require('../services/applicationMatch.service');
const { getSmtpConfig } = require('../services/email.service');
const { brands: getBrands } = require('../services/recruitmentCatalog.service');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const { setImmediate: yieldEventLoop } = require('node:timers/promises');
const STATUSES = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];
const SOURCES = ['manual', 'cv_upload', 'outlook', 'kfc', 'pizzahut', 'jobsearch', 'external_form', 'unknown'];
function filters(query) {
  const jobs = {}, apps = {};
  for (const [key, value] of Object.entries(query)) if (!['brandId', 'branchId', 'jobId', 'from', 'to', 'source', 'status'].includes(key) || typeof value !== 'string' || value.length > 80) throw Error('Invalid analytics filter.');
  if (query.brandId) { if (query.brandId !== 'unset' && !/^[a-z0-9][a-z0-9-]{0,59}$/.test(query.brandId)) throw Error('Invalid brand filter.'); jobs.brandId = query.brandId === 'unset' ? null : query.brandId; }
  for (const key of ['branchId', 'jobId']) if (query[key]) { if (!mongoose.isObjectIdOrHexString(query[key])) throw Error('Invalid resource filter.'); jobs[key === 'jobId' ? '_id' : key] = new mongoose.Types.ObjectId(query[key]); }
  if (query.status) { if (!STATUSES.includes(query.status)) throw Error('Invalid status filter.'); apps.status = query.status; }
  if (query.source) { if (!SOURCES.includes(query.source)) throw Error('Invalid source filter.'); apps['source.key'] = query.source === 'unknown' ? { $nin: SOURCES.slice(0, -1) } : query.source; }
  for (const key of ['from', 'to']) if (query[key]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query[key])) throw Error('Dates must be YYYY-MM-DD UTC.');
    const at = new Date(query[key] + 'T00:00:00.000Z'); if (!Number.isFinite(at.getTime()) || at.toISOString().slice(0, 10) !== query[key]) throw Error('Invalid calendar date.');
    apps.createdAt ||= {}; apps.createdAt[key === 'from' ? '$gte' : '$lt'] = key === 'from' ? at : new Date(at.getTime() + 86400000);
  }
  if (apps.createdAt?.$gte && apps.createdAt?.$lt && apps.createdAt.$gte >= apps.createdAt.$lt) throw Error('Invalid date range.');
  return { jobs, apps };
}
function parentLookup(req, model, localField, resource, projection, extra = {}) {
  const scope = aggregateResourceFilter(req, resource), as = model === Job ? 'job' : 'candidate';
  const deny = scope._id?.$in?.length === 0;
  const checks = [{ $eq: [{ $type: '$' + localField }, 'objectId'] }];
  if (!deny) for (const [key, value] of Object.entries({ ...scope, ...extra })) checks.push({ $eq: [{ $ifNull: ['$$parent.' + key, null] }, { $literal: value }] });
  const safe = { _id: '$$parent._id' };
  for (const field of Object.keys(projection)) {
    const path = field.split('.'); let target = safe;
    for (const part of path.slice(0, -1)) target = target[part] ||= {};
    target[path.at(-1)] = '$$parent.' + field;
  }
  if (deny) return [{ $set: { [as]: [] } }];
  // Keep indexed equality joins; a foreign projection pipeline forces the
  // slower correlated execution path. Redact after each independent grant.
  return [{ $lookup: { from: model.collection.name, localField, foreignField: '_id', as } },
    { $set: { [as]: { $map: { input: { $filter: { input: '$' + as, as: 'parent', cond: { $and: checks } } }, as: 'parent', in: safe } } } }];
}
function base(req, criteria, scoring = false, cohortJobs = null, summary = false) {
  const jobs = scoring ? { title: 1, requiredSkills: 1, preferredSkills: 1, experienceYears: 1, requiredEducation: 1, requiredCertificates: 1, criterionWeights: 1 } : { status: 1, brandId: 1 };
  const candidates = scoring ? { role: 1, skills: 1, experience: 1, education: 1, certificates: 1, reviewedFields: 1, 'cvReview.reviewStatus': 1, 'cvReview.version': 1, employmentHistory: 1 } : { 'cvReview.version': 1, 'cvReview.reviewStatus': 1, 'cvReview.processingStatus': 1, 'cvOriginal.sha256': 1 };
  const groups = new Map();
  for (const job of cohortJobs || []) { const brand=job.brandId??null; if(!groups.has(brand))groups.set(brand,[]);groups.get(brand).push(job._id); }
  const jobStages = cohortJobs && !scoring ? [{ $set: { job: { brandId: { $switch: { branches: [...groups].map(([brand,ids])=>({case:{$in:['$jobId',{$literal:ids}]},then:{$literal:brand}})), default:null } } } } }] : [...parentLookup(req, Job, 'jobId', 'recruitment', jobs, criteria.jobs), { $unwind: '$job' }];
  // Empty cohorts still need a valid switch expression; the match admits no rows.
  if(cohortJobs && !groups.size)jobStages.splice(0,1,{$set:{job:{brandId:null}}});
  return [{ $match: { $and: [aggregateResourceFilter(req, 'application'), criteria.apps, ...(cohortJobs ? [{jobId:{$in:cohortJobs.map(j=>j._id)}}] : [])] } },
    { $project: summary ? {jobId:1,status:1,'source.key':1,processingState:1} : scoring ? { jobId: 1, candidateId: 1, scoreStatus: 1, 'matching.version': 1, 'matching.jobHash': 1, 'matching.candidateHash': 1, 'matching.score': 1, 'matching.scoreStatus': 1 } : { jobId: 1, candidateId: 1, status: 1, 'source.key': 1, createdAt: 1, stageEnteredAt: 1, processingState: 1, 'interview.result': 1, events: { $map: { input: { $ifNull: ['$events', []] }, as: 'e', in: { type: '$$e.type', at: '$$e.at', after: { status: '$$e.after.status' }, delivery: { state: '$$e.delivery.state' } } } } } },
    ...jobStages,
    ...(summary ? [] : [...parentLookup(req, Candidate, 'candidateId', 'candidate', candidates), { $set: { candidate: { $arrayElemAt: ['$candidate', 0] } } }])];
}
const number = (rows, key) => rows?.[0]?.[key] ?? 0;
const dailyAverage = (sum, count) => count ? Math.round(sum / count / 86400000 * 100) / 100 : null;
async function scoreDistribution(req, criteria, cohortJobs = null) {
  const buckets = [0, 20, 40, 60, 80].map(min => ({ min, max: min === 80 ? 100 : min + 19, count: 0 }));
  const states = { pending: 0, incomplete: 0, stale: 0, legacy: 0, restricted: 0, calculated: 0 }; let checked = 0;
  // Replace per-row correlated score lookups with bounded parent batches. Cache
  // at most 500 Job facts in this request; never cache actor grants globally.
  const jobCache = new Map(), deadline = Date.now() + 10000;
  const checkDeadline = () => { if (Date.now() > deadline || req.res?.destroyed) throw Object.assign(new Error('Analytics deadline exceeded.'), { code: 50 }); };
  const cursor = Application.find({ $and: [resourceFilter(req, 'application'), criteria.apps, ...(cohortJobs ? [{jobId:{$in:cohortJobs.map(j=>j._id)}}] : criteria.jobs._id ? [{ jobId: criteria.jobs._id }] : [])] }).select('jobId candidateId scoreStatus matching.version matching.jobHash matching.candidateHash matching.score matching.scoreStatus').sort({ _id: 1 }).maxTimeMS(10000).lean().cursor({ batchSize: 1000 });
  async function consume(rows) {
    checkDeadline();
    const ids = [...new Set(rows.filter(row => mongoose.isObjectIdOrHexString(row.jobId)).map(row => String(row.jobId)))];
    const batchJobs = new Map(ids.filter(id => jobCache.has(id)).map(id => [id, jobCache.get(id)]));
    const wanted = ids.filter(id => !jobCache.has(id));
    const jobs = wanted.length ? await Job.find({ $and: [resourceFilter(req, 'recruitment'), criteria.jobs, { _id: { $in: wanted } }] }).select('title requiredSkills preferredSkills experienceYears requiredEducation requiredCertificates criterionWeights').maxTimeMS(10000).lean() : [];
    const found = new Map(jobs.map(job => [String(job._id), { hash: jobFingerprint(job) }]));
    for (const id of wanted) { const value = found.get(id) || null; batchJobs.set(id, value); jobCache.set(id, value); if (jobCache.size > 500) jobCache.delete(jobCache.keys().next().value); }
    const allowed = rows.filter(row => batchJobs.get(String(row.jobId)));
    const candidates = allowed.length ? await Candidate.find({ $and: [resourceFilter(req, 'candidate'), { _id: { $in: allowed.map(row => row.candidateId).filter(id => mongoose.isObjectIdOrHexString(id)) } }] }).select('role skills experience education certificates reviewedFields cvReview.reviewStatus cvReview.version employmentHistory.title employmentHistory.start employmentHistory.end employmentHistory.ongoing').maxTimeMS(10000).lean() : [];
    checkDeadline();
    const candidateHashes = new Map(candidates.map(candidate => [String(candidate._id), candidateFingerprint(candidate)]));
    for (const [index, row] of allowed.entries()) {
      checked++; let state = Object.hasOwn(states, row.scoreStatus) ? row.scoreStatus : 'legacy';
      const candidateHash = candidateHashes.get(String(row.candidateId));
      if (!candidateHash) state = 'restricted';
      else if (row.matching?.version !== VERSION) state = 'legacy';
      else { state = row.scoreStatus === 'stale' || batchJobs.get(String(row.jobId)).hash !== row.matching.jobHash || candidateHash !== row.matching.candidateHash ? 'stale' : Object.hasOwn(states, row.matching.scoreStatus) ? row.matching.scoreStatus : 'legacy'; }
      const score = row.matching?.score;
      if (state === 'calculated' && (!Number.isFinite(score) || score < 0 || score > 100)) state = 'incomplete';
      states[state]++; if (state === 'calculated') buckets[Math.min(4, Math.floor(score / 20))].count++;
      if (index % 32 === 0) { await yieldEventLoop(); checkDeadline(); }
    }
  }
  try { let rows = []; for await (const row of cursor) { rows.push(row); if (rows.length === 1000) { await consume(rows); rows = []; } } if (rows.length) await consume(rows); } finally { await cursor.close(); }
  return { states, buckets, checked };
}
function handler(mode) { return async (req, res, next) => {
  let criteria; try { criteria = filters(req.query); } catch (e) { return res.status(400).json({ message: e.message }); }
  const jobScope = resourceFilter(req, 'recruitment');
  if (jobScope._id?.$in?.length === 0) return res.status(403).json({ message: 'Scoped vacancy read permission is required.' });
  const at = new Date();
  const authority = () => JSON.stringify([req.user.id, req.user.role, req.user.departmentId, req.authRole.permissions]);
  const initialAuthority = authority();
  try {
    // At most500 current scoped Job identities/brands, owned by this request.
    // Repeated Job joins dominate large Application cohorts; larger Job sets
    // use the existing equality-join fallback without truncating any count.
    const jobRows=await Job.find({$and:[resourceFilter(req,'recruitment'),criteria.jobs]}).select('_id brandId').limit(501).maxTimeMS(10000).lean();
    const cohortJobs=jobRows.length<=500?jobRows:null;
    const pipeline = [...base(req, criteria, false, cohortJobs, mode === 'overview' || mode === 'scores'), { $set: {
      sourceKey: { $cond: [{ $in: ['$source.key', SOURCES.slice(0, -1)] }, '$source.key', 'unknown'] },
      hireAt: { $arrayElemAt: [{ $map: { input: { $filter: { input: { $ifNull: ['$events', []] }, as: 'e', cond: { $and: [{ $eq: ['$$e.type', 'status'] }, { $eq: ['$$e.after.status', 'Hired'] }] } } }, as: 'e', in: '$$e.at' } }, -1] },
    } }, { $facet: {
      totals: [{ $group: { _id: null, applications: { $sum: 1 }, restrictedCandidates: { $sum: { $cond: ['$candidate._id', 0, 1] } }, processing: { $sum: { $cond: [{ $in: ['$processingState', ['queued', 'running']] }, 1, 0] } } } }],
      funnel: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      sources: [{ $group: { _id: '$sourceKey', count: { $sum: 1 } } }],
      brands: [{ $group: { _id: { $ifNull: ['$job.brandId', 'unset'] }, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 51 }],
      interviews: [{ $match: { status: 'Interview' } }, { $group: { _id: { $cond: [{ $in: ['$interview.result', ['pending', 'passed', 'failed', 'no_show', 'cancelled']] }, '$interview.result', 'unscheduled'] }, count: { $sum: 1 } } }],
      stageTimes: [{ $match: { $expr: { $and: [{ $eq: [{ $type: '$stageEnteredAt' }, 'date'] }, { $lte: ['$stageEnteredAt', at] }] } } }, { $group: { _id: '$status', count: { $sum: 1 }, sumMs: { $sum: { $subtract: [at, '$stageEnteredAt'] } } } }],
      hireTimes: [{ $match: { status: 'Hired', $expr: { $and: [{ $eq: [{ $type: '$hireAt' }, 'date'] }, { $eq: [{ $type: '$createdAt' }, 'date'] }, { $gte: ['$hireAt', '$createdAt'] }, { $lte: ['$hireAt', at] }] } } }, { $group: { _id: null, count: { $sum: 1 }, sumMs: { $sum: { $subtract: ['$hireAt', '$createdAt'] } } } }],
      review: [{ $match: { 'candidate._id': { $exists: true }, 'candidate.cvReview.version': { $exists: true } } }, { $group: { _id: '$candidate._id', status: { $first: '$candidate.cvReview.reviewStatus' }, processing: { $first: '$candidate.cvReview.processingStatus' } } },
        { $group: { _id: null, pending: { $sum: { $cond: [{ $ne: ['$status', 'confirmed'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$processing', 'failed'] }, 1, 0] } }, ocrRequired: { $sum: { $cond: [{ $eq: ['$processing', 'unsupported_ocr'] }, 1, 0] } } } }],
      duplicates: [{ $match: { 'candidate.cvOriginal.sha256': { $regex: '^[a-f0-9]{64}$' } } }, { $group: { _id: { hash: '$candidate.cvOriginal.sha256', candidate: '$candidate._id' } } }, { $group: { _id: '$_id.hash', candidates: { $sum: 1 } } }, { $match: { candidates: { $gt: 1 } } }, { $group: { _id: null, groups: { $sum: 1 }, extraProfiles: { $sum: { $subtract: ['$candidates', 1] } } } }],
      deliveries: [{ $unwind: '$events' }, { $match: { 'events.delivery.state': { $in: ['pending', 'blocked', 'running', 'sent', 'failed', 'skipped'] } } }, { $group: { _id: '$events.delivery.state', count: { $sum: 1 } } }],
    } }];
    if (mode === 'overview' || mode === 'scores') {
      const facet = pipeline.at(-1).$facet;
      for (const key of Object.keys(facet)) if (!(mode === 'scores' ? ['totals'] : ['totals','funnel','sources','brands']).includes(key)) delete facet[key];
      // Summary never looks up Candidate facts or reads Application history.
      delete facet.totals[0].$group.restrictedCandidates;
      delete pipeline[base(req, criteria, false, cohortJobs, true).length].$set.hireAt;
    }
    // A bounded scoped Job cohort already proves parent eligibility. Scores
    // need only an independent total for scan consistency, not brand switches
    // or summary grouping. Larger cohorts retain the equality-join fallback.
    const metricRead = mode === 'scores' && cohortJobs
      ? Application.countDocuments({ $and: [resourceFilter(req, 'application'), criteria.apps, { jobId: { $in: cohortJobs.map(job => job._id) } }] })
        .maxTimeMS(10000).then(applications => [{ totals: [{ applications }] }])
      : Application.aggregate(pipeline).option({ maxTimeMS: 10000 });
    const [[metrics], scores, active, optionJobs, brands] = await Promise.all([
      metricRead, mode === 'overview' || mode === 'operations' ? null : scoreDistribution(req, criteria, cohortJobs),
      mode === 'scores' ? [] : Job.aggregate([{ $match: { $and: [aggregateResourceFilter(req, 'recruitment'), criteria.jobs, { status: 'Open', archivedAt: null }] } }, { $facet: { totals: [{ $count: 'count' }], brands: [{ $group: { _id: { $ifNull: ['$brandId', 'unset'] }, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 51 }] } }]).option({ maxTimeMS: 10000 }),
      mode === 'scores' ? [] : Job.find({ $and: [resourceFilter(req, 'recruitment'), criteria.jobs, {archivedAt:null}] }).select('_id title brandId branchId').sort({ title: 1, _id: 1 }).limit(51).lean(), mode === 'scores' ? [] : getBrands(),
    ]);
    const branchIds = [...new Set(optionJobs.map(j => j.branchId).filter(Boolean).map(String))];
    const branches = mode === 'scores' ? [] : await Branch.find({ $and: [resourceFilter(req, 'recruitment'), { _id: { $in: branchIds } }] }).select('_id name brandId').limit(50).lean();
    await verifyToken(req, res, () => {}); if (res.headersSent || res.destroyed) return;
    req.authRole = { permissions: await getRolePermissions(req.user.role) };
    const permits = resource => req.authRole.permissions.find(p => (p.resource === resource || p.resource === '*') && (p.action === 'read' || p.action === '*'));
    if (['application', 'recruitment'].some(resource => !permits(resource) || permits(resource).scope === 'none')) return res.status(403).json({ message: 'Scoped Application and vacancy read permissions are required.' });
    if (authority() !== initialAuthority) return res.status(409).json({ code: 'ANALYTICS_CHANGED', message: 'Permissions changed during analytics. Refresh and retry.' });
    if(cohortJobs){
      const current=await Job.find({$and:[resourceFilter(req,'recruitment'),criteria.jobs,{_id:{$in:cohortJobs.map(j=>j._id)}}]}).select('_id brandId').maxTimeMS(10000).lean();
      const initial=new Map(cohortJobs.map(j=>[String(j._id),j.brandId??null]));
      if(current.length!==initial.size||current.some(j=>!initial.has(String(j._id))||initial.get(String(j._id))!==(j.brandId??null)))return res.status(409).json({code:'ANALYTICS_CHANGED',message:'Vacancy scope changed during analytics. Refresh and retry.'});
    }
    await verifyToken(req,res,()=>{});if(res.headersSent||res.destroyed)return;req.authRole={permissions:await getRolePermissions(req.user.role)};if(authority()!==initialAuthority)return res.status(409).json({code:'ANALYTICS_CHANGED',message:'Permissions changed during analytics. Refresh and retry.'});
    const total = number(metrics.totals, 'applications'), candidateScope = resourceFilter(req, 'candidate');
    if (mode === 'scores') return res.json({version:'hr-analytics-scores-v1',generatedAt:at,filters:req.query,total,consistent:scores.checked===total,scores:scores.checked===total?{states:scores.states,buckets:scores.buckets}:null});
    const activeByBrand = active[0].brands;
    const response = { version: mode === 'overview' ? 'hr-analytics-overview-v1' : 'hr-analytics-v1', generatedAt: at, filters: req.query,
      coverage: { candidateReadable: !(candidateScope._id?.$in?.length === 0), restrictedCandidateApplications: number(metrics.totals, 'restrictedCandidates'), scoreScanConsistent: scores?.checked === total },
      totals: { activeVacancies: number(active[0].totals, 'count'), applications: total, newApplications: metrics.funnel.find(r => r._id === 'Applied')?.count || 0, processing: number(metrics.totals, 'processing') },
      funnel: STATUSES.map(status => ({ status, count: metrics.funnel.find(r => r._id === status)?.count || 0 })),
      sources: SOURCES.map(key => ({ key, count: metrics.sources.find(r => r._id === key)?.count || 0 })),
      byBrand: [...new Set([...metrics.brands, ...activeByBrand].map(r => r._id))].slice(0, 50).map(id => ({ id, applications: metrics.brands.find(r => r._id === id)?.count || 0, activeVacancies: activeByBrand.find(r => r._id === id)?.count || 0 })),
      byBrandTruncated: new Set([...metrics.brands, ...activeByBrand].map(r => r._id)).size > 50,
      review: { pending: number(metrics.review, 'pending'), failed: number(metrics.review, 'failed'), ocrRequired: number(metrics.review, 'ocrRequired') },
      duplicateAlerts: { groups: number(metrics.duplicates, 'groups'), extraProfiles: number(metrics.duplicates, 'extraProfiles') },
      interviews: (metrics.interviews || []).map(r => ({ result: r._id, count: r.count })),
      timeInStage: STATUSES.map(status => { const r = (metrics.stageTimes || []).find(r => r._id === status); return { status, samples: r?.count || 0, averageDays: dailyAverage(r?.sumMs, r?.count) }; }),
      timeToHire: { samples: number(metrics.hireTimes, 'count'), averageDays: dailyAverage(number(metrics.hireTimes, 'sumMs'), number(metrics.hireTimes, 'count')) },
      scores: scores?.checked === total ? { states: scores.states, buckets: scores.buckets } : null,
      deliveryQueue: (metrics.deliveries || []).map(r => ({ state: r._id, count: r.count })),
      integrations: { ai: require('../services/hrAiProvider.service').health().state, outlook: 'not_integrated', externalSites: 'not_connected', storage: 'local_file_system', smtp: getSmtpConfig() ? 'configured_not_verified' : 'not_configured' },
      options: { brands: brands.slice(0, 50), jobs: optionJobs.slice(0, 50).map(j => ({ id: String(j._id), title: String(j.title).slice(0, 200), brandId: j.brandId || null, branchId: j.branchId ? String(j.branchId) : null })), branches: branches.map(b => ({ id: String(b._id), name: b.name, brandId: b.brandId })), jobsTruncated: optionJobs.length > 50, brandsTruncated: brands.length > 50 },
    };
    if(mode==='overview') { delete response.coverage.restrictedCandidateApplications; delete response.coverage.scoreScanConsistent; }
    if(mode==='overview') for(const key of ['review','duplicateAlerts','interviews','timeInStage','timeToHire','scores','deliveryQueue','integrations']) delete response[key];
    res.json(response);
  } catch (e) { if (res.destroyed) return; if (e.code === 50) return res.status(503).json({ code: 'ANALYTICS_TIMEOUT', message: 'Analytics timed out. Narrow the filters and retry.' }); next(e); }
}; }
exports.get = handler('full');
exports.overview = handler('overview');
exports.scores = handler('scores');
exports.operations = handler('operations');
module.exports.STATUSES = STATUSES;
module.exports.SOURCES = SOURCES;
