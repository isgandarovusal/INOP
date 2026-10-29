const mongoose = require('mongoose');
const Brand = require('../models/recruitmentBrand.model');
const Branch = require('../models/recruitmentBranch.model');
const { resourceFilter } = require('./hrResourceScope.service');
const defaultBrands = Object.freeze([
  { id: 'kfc', name: 'KFC', active: true },
  { id: 'pizza-hut', name: 'Pizza Hut', active: true },
  { id: 'simit-sarayi', name: 'Simit Sarayı', active: true },
]);
async function brands() {
  const custom = await Brand.find().select('_id name active').sort({ name: 1 }).lean();
  return [...defaultBrands, ...custom.filter(b => !defaultBrands.some(x => x.id === b._id)).map(({ _id, name, active }) => ({ id: _id, name, active }))];
}
async function validateLocation(req, fields, current = {}) {
  const brandId = fields.brandId !== undefined ? fields.brandId : current.brandId ?? null;
  const branchId = fields.branchId !== undefined ? fields.branchId : current.branchId ?? null;
  if (brandId !== null && (typeof brandId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(brandId))) return 'Invalid brand';
  const catalog = await brands();
  if (brandId && !catalog.some(b => b.id === brandId && (b.active || brandId === current.brandId))) return 'Unknown or inactive brand';
  if (branchId !== null) {
    if (!mongoose.isObjectIdOrHexString(branchId)) return 'Invalid branch';
    const branch = await Branch.findOne({ $and: [{ _id: branchId }, resourceFilter(req, 'recruitment')] }).lean();
    if (!branch || branch.brandId !== brandId || (branch.status !== 'active' && String(current.branchId) !== String(branchId))) return 'Branch is unavailable or does not belong to the selected brand';
  }
  return null;
}
async function decorateJobs(req, records) {
  const list = records.map(j => j.toObject?.() || j);
  const ids = [...new Set(list.map(j => j.branchId).filter(Boolean).map(String))];
  const brandIds = [...new Set(list.map(j => j.brandId).filter(Boolean))];
  const [custom, branches] = await Promise.all([brandIds.length ? Brand.find({ _id: { $in: brandIds } }).select('name active').lean() : [], ids.length ? Branch.find({ $and: [{ _id: { $in: ids } }, resourceFilter(req, 'recruitment')] }).select('name').lean() : []]);
  const catalog = [...defaultBrands, ...custom.filter(b => !defaultBrands.some(d => d.id === b._id)).map(b => ({ id: b._id, name: b.name }))];
  const branchNames = new Map(branches.map(b => [String(b._id), b.name]));
  return list.map(j => ({ ...j, brandId: j.brandId ?? null, branchId: j.branchId ?? null,
    brandName: catalog.find(b => b.id === j.brandId)?.name ?? null,
    branchName: branchNames.get(String(j.branchId)) ?? null }));
}
async function decorateApplications(req, records) {
  const jobs = await decorateJobs(req, records.map(a => a.jobId).filter(j => j && typeof j === 'object' && j.title !== undefined));
  const map = new Map(jobs.map(j => [String(j._id), j]));
  return records.map(a => ({ ...a, jobId: a.jobId && typeof a.jobId === 'object' && a.jobId.title !== undefined ? map.get(String(a.jobId._id)) : a.jobId }));
}
module.exports = { brands, defaultBrands, validateLocation, decorateJobs, decorateApplications };
