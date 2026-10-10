const mongoose = require('mongoose');
const Brand = require('../models/recruitmentBrand.model');
const Branch = require('../models/recruitmentBranch.model');
const { brands, defaultBrands } = require('../services/recruitmentCatalog.service');

function globalCatalogWrite(req, res) {
  // Globally shared labels are not own/department/assigned records.
  if (req.permission?.scope === 'all') return true;
  res.status(403).json({ message: 'Global catalog changes require all scope.' }); return false;
}
exports.brands = async (req, res, next) => { try { res.json(await brands()); } catch (e) { next(e); } };
exports.createBrand = async (req, res, next) => {
  if (!globalCatalogWrite(req, res)) return;
  const { id, name } = req.body;
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(id) || typeof name !== 'string' || !name.trim() || name.length > 80) return res.status(400).json({ message: 'Invalid brand id or name.' });
  if (defaultBrands.some(b => b.id === id)) return res.status(409).json({ message: 'Brand already exists.' });
  try { const b = await Brand.create({ _id: id, name }); res.status(201).json({ id: b._id, name: b.name, active: b.active }); }
  catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'Brand already exists.' }); next(e); }
};
function scoped(req, id) { return { $and: [req.dataScope, ...(id ? [{ _id: id }] : [])] }; }
exports.branches = async (req, res, next) => {
  try {
    const filters = req.query.brandId ? { brandId: String(req.query.brandId) } : {};
    res.json(await Branch.find({ $and: [scoped(req), filters] }).sort({ name: 1 }).lean());
  } catch (e) { next(e); }
};
exports.branch = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid branch id.' });
  try { const row = await Branch.findOne(scoped(req, req.params.id)).lean(); if (!row) return res.status(404).json({ message: 'Branch not found.' }); res.json(row); } catch (e) { next(e); }
};
async function payload(body, current = {}) {
  const fields = {};
  for (const key of ['code', 'name', 'brandId', 'kind', 'location', 'status']) if (body[key] !== undefined) fields[key] = body[key];
  const row = { brandId: null, status: 'active', ...current, ...fields };
  if (typeof row.code !== 'string' || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(row.code) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 100 ||
      !['restaurant', 'office', 'warehouse', 'remote'].includes(row.kind) || !['active', 'inactive'].includes(row.status) ||
      (row.location !== undefined && (typeof row.location !== 'string' || row.location.length > 200))) return null;
  if (row.brandId !== null && (typeof row.brandId !== 'string' || !(await brands()).some(b => b.id === row.brandId && b.active))) return null;
  if (row.kind === 'restaurant' && !row.brandId) return null;
  return fields;
}
exports.createBranch = async (req, res, next) => {
  try {
    const fields = await payload(req.body); if (!fields) return res.status(400).json({ message: 'Invalid branch.' });
    const row = await Branch.create({ ...fields, createdBy: req.user.id, assignedTo: req.user.id, departmentId: req.user.departmentId || '' }); res.status(201).json(row);
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'Branch code already exists.' }); next(e); }
};
exports.updateBranch = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid branch id.' });
  try {
    const current = await Branch.findOne(scoped(req, req.params.id)).lean(); if (!current) return res.status(404).json({ message: 'Branch not found.' });
    // Parent identity is immutable; a new physical branch uses a new record.
    if (req.body.brandId !== undefined && req.body.brandId !== current.brandId) return res.status(400).json({ message: 'Branch brand cannot be changed.' });
    const fields = await payload(req.body, current); if (!fields || !Object.keys(fields).length) return res.status(400).json({ message: 'Invalid branch update.' });
    res.json(await Branch.findOneAndUpdate(scoped(req, req.params.id), { $set: fields }, { returnDocument: 'after', runValidators: true }));
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'Branch code already exists.' }); next(e); }
};
exports.deleteBranch = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return res.status(400).json({ message: 'Invalid branch id.' });
  // Soft deactivation preserves all historical vacancy/application references.
  try { const row = await Branch.findOneAndUpdate(scoped(req, req.params.id), { $set: { status: 'inactive' } }, { returnDocument: 'after' }); if (!row) return res.status(404).json({ message: 'Branch not found.' }); res.json({ message: 'Branch deactivated.' }); } catch (e) { next(e); }
};
