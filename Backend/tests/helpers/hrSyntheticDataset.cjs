// Only call inside withAuditFixture: it creates/verifies a uniquely owned loopback DB.
const mongoose = require('mongoose');
const Job = require('../../models/job.model'), Candidate = require('../../models/candidate.model'), Application = require('../../models/application.model'), Branch = require('../../models/recruitmentBranch.model');
const { calculateApplicationMatch } = require('../../services/applicationMatch.service');
exports.hrSyntheticDataset = async (h, count) => {
  if (mongoose.connection.host !== '127.0.0.1' || !/^inop_audit_test_\d+_[a-f0-9]{12}$/.test(mongoose.connection.name) || ![0, 5000, 50000].includes(count)) throw Error('Synthetic HR benchmark requires an owned isolated fixture.');
  for (const scope of ['own', 'department', 'assigned']) await h.models.Role.updateOne({ key: `test_${scope}` }, { $push: { permissions: ['application', 'candidate', 'recruitment'].map(resource => ({ resource, action: '*', scope })) } });
  const provenance = { createdBy: h.actors.own._id, assignedTo: h.actors.assigned._id, departmentId: 'dep_A' }, jobs = [];
  for (const [i, brandId] of ['kfc', 'pizza-hut', 'simit-sarayi'].entries()) {
    const branch = await Branch.create({ code: `synthetic-${i}`, name: `Synthetic branch ${i}`, kind: 'restaurant', brandId, ...provenance });
    jobs.push((await Job.create({ title: 'Cashier', description: 'Synthetic responsibilities '.repeat(200), department: 'Operations', brandId, branchId: branch._id, requiredSkills: ['cash handling', 'customer service', 'food safety'], preferredSkills: ['HACCP'], experienceYears: 2, ...provenance })).toObject());
  }
  const owners = ['own', 'peer', 'assigned', 'foreign', 'hr'], stages = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offered', 'Hired', 'Rejected'];
  const origin = Date.UTC(2026, 9, 1), started = performance.now();
  for (let begin = 0; begin < count; begin += 500) {
    const candidates = [], applications = [];
    for (let i = begin; i < Math.min(begin + 500, count); i++) {
      const owner = h.actors[owners[i % 5]], job = jobs[i % 3], candidateId = new mongoose.Types.ObjectId(), id = new mongoose.Types.ObjectId(), createdAt = new Date(origin + i * 1000);
      const candidate = { _id: candidateId, name: `Synthetic applicant ${String(i).padStart(5, '0')}`, role: 'Cashier', status: 'new', email: `synthetic-${i}@example.invalid`, phone: '+994501234567', skills: ['cash handling', 'customer service', ...(i % 2 ? [] : ['food safety']), 'HACCP', 'kitchen operations', 'shift management', 'team management'], experience: 3, education: 'Synthetic secondary school', certificates: ['Synthetic food safety certificate'], languages: ['az', 'en', 'ru'], reviewedFields: ['skills', 'experience'], cvReview: { version: 'rules-2', reviewStatus: 'confirmed' }, employmentHistory: Array.from({ length: 8 }, (_, n) => ({ title: 'Cashier', organization: `Synthetic branch ${n}`, start: { year: 2018 + n, month: 1 }, end: { year: 2018 + n, month: 12 }, ongoing: false, raw: `Synthetic employment evidence ${n}` })), createdBy: owner._id, assignedTo: owner._id, departmentId: owner.departmentId, createdAt, updatedAt: createdAt, __v: 0 };
      const application = { _id: id, jobId: job._id, candidateId, status: stages[i % 7], processingState: i % 7 === 0 && i % 2 === 0 ? 'queued' : 'idle', boardOrder: `a0${id}V`, createdBy: owner._id, assignedTo: owner._id, departmentId: owner.departmentId, createdAt, updatedAt: createdAt, stageEnteredAt: createdAt, notes: 'Synthetic HR note '.repeat(60), events: [], source: { key: 'manual', receivedAt: createdAt }, __v: 0 };
      application.matching = calculateApplicationMatch(job, candidate, { application }); application.score = application.matching.score; application.scoreStatus = application.matching.scoreStatus;
      candidates.push(candidate); applications.push(application);
    }
    await Candidate.collection.insertMany(candidates); await Application.collection.insertMany(applications);
  }
  for (const model of [Candidate, Application, Job]) await model.createIndexes();
  return { jobs, owners, stages, inserted: count, preparationMs: performance.now() - started };
};
