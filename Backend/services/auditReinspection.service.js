const crypto = require('node:crypto'), Audit = require('../models/audit.model'), Link = require('../models/auditReinspection.model');
const { auditError, transaction } = require('./auditTransaction.service'), { getAuditScopeFilter } = require('../middleware/auditScope.middleware');
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? (v instanceof Date ? v.toISOString() : typeof v.toHexString === 'function' ? v.toHexString() : Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]))) : v;
const version = row => crypto.createHash('sha256').update(JSON.stringify(canonical(row))).digest('hex');
async function authority(req) {
    const fresh = { headers: req.headers };
    let passed = false, status = 401;
    await require('../middleware/auth.middleware').verifyToken(fresh, { status(n) { status = n; return this; }, json() { return this; } }, () => passed = true);
    if (!passed)
        throw auditError(status, 'Current authorization is unavailable.');
    fresh.authRole = { permissions: await require('../middleware/auth.middleware').getRolePermissions(fresh.user.role) };
    fresh.auditorProfile = await require('../models/auditorProfile.model').findById(fresh.user.id).lean() || undefined;
    return fresh;
}
async function scope(req, action = 'read', direction) { const value = require('./directionalPermissions.service').scope(req.authRole.permissions, 'audit', action, direction); if (!value || value === 'none')
    throw auditError(403, 'Independent audit permission is required.'); return { ...req, auditRequestedDirection: direction, permission: { resource: 'audit', action, scope: value } }; }
async function parent(req, id, session) { const read = await scope(req), filter = await getAuditScopeFilter(read); if (!filter)
    throw auditError(403, 'Audit access denied.'); let query = Audit.findOne({ $and: [{ _id: id }, filter] }).lean(); if (session)
    query = query.session(session); const row = await query; if (!row)
    throw auditError(404, 'Audit unavailable.'); return row; }
async function eligible(row, session) { let q = require('../models/auditContext.model').findById(row._id).lean(); if (session)
    q = q.session(session); const context = await q; return row.status === 'completed' && !!row.templateRevisionId && !!context?.templateRevisionId && String(context.templateRevisionId) === String(row.templateRevisionId); }
function signature(req) { return version([req.user, req.authRole.permissions, req.auditorProfile]); }
async function create(req, id, input) {
    if (!input || Array.isArray(input) || Object.keys(input).some(k => !['date', 'commandId', 'expectedVersion'].includes(k)) || typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0, 10) !== input.date || typeof input.commandId !== 'string' || !/^[-a-zA-Z0-9]{16,80}$/.test(input.commandId) || typeof input.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(input.expectedVersion))
        throw auditError(400, 'Invalid reinspection command.');
    const fresh = await authority(req), before = signature(fresh), original = await parent(fresh, id);
    if (!await eligible(original))
        throw auditError(409, 'A finalized versioned audit is required.');
    const createReq = await scope(fresh, 'create', original.auditType), key = crypto.createHash('sha256').update([String(original._id), fresh.user.id, input.commandId].join(':')).digest('hex'), commandHash = version([input.date, input.expectedVersion]);
    try {
        await Link.updateOne({ _id: 'gate:' + original._id }, { $setOnInsert: { kind: 'gate', parentAuditId: original._id, revision: 0 } }, { upsert: true });
    }
    catch (e) {
        if (e.code !== 11000)
            throw e;
    }
    return transaction(async (session) => {
        await Link.updateOne({ _id: 'gate:' + original._id }, { $inc: { revision: 1 } }, { session });
        const row = await parent(fresh, id, session);
        if (!await eligible(row, session) || version(row) !== input.expectedVersion)
            throw auditError(409, 'Original audit changed; refresh before reinspecting.');
        const existing = await Link.findById(key).session(session).lean();
        if (existing) {
            if (existing.commandHash !== commandHash)
                throw auditError(409, 'Reinspection command changed.');
            const child = await parent(fresh, existing.childAuditId, session);
            if (signature(await authority(req)) !== before)
                throw auditError(403, 'Audit permission changed.');
            if (version(await parent(await authority(req), id)) !== input.expectedVersion)
                throw auditError(409, 'Original audit context changed.');
            return { audit: child, replayed: true };
        }
        const context = await require('../models/auditContext.model').findById(row._id).session(session).lean();
        const direction = row.auditType, controller = direction === 'hr' ? 'hr' : direction === 'service' ? 'service' : direction === 'standard' ? 'standard' : direction === 'occupational-safety' ? 'hse' : null;
        if (!controller)
            throw auditError(409, 'Unsupported audit direction.');
        const body = controller === 'hse' ? { objectType: context.objectType || 'restaurant', objectId: context.objectId || context.restaurantId, brandId: context.brandId, date: input.date } : { brandId: context.brandId, restaurantId: context.restaurantId, date: input.date };
        const call = { ...createReq, body };
        call[require('./auditCreationSession.service').key] = session;
        let result, code = 200;
        await require('../controllers/' + controller + 'Audit.controller').create(call, { status(n) { code = n; return this; }, json(value) { result = value; return this; } });
        if (code !== 201 || !result?.data?._id)
            throw auditError(code >= 400 ? code : 500, 'Reinspection creation failed.');
        const child = await parent(fresh, result.data._id, session);
        if (signature(await authority(req)) !== before)
            throw auditError(403, 'Audit permission changed.');
        if (version(await parent(await authority(req), id)) !== input.expectedVersion)
            throw auditError(409, 'Original audit context changed.');
        await Link.create([{ _id: key, kind: 'link', parentAuditId: row._id, childAuditId: child._id, actorId: fresh.user.id, commandHash, date: input.date }], { session });
        await require('./auditLifecycle.service').recordHistory(child, fresh.user, 'reinspection-created', session);
        return { audit: child, replayed: false };
    });
}
async function list(req, id) {
    if (Object.keys(req.query || {}).some(k => !['page', 'limit'].includes(k)))
        throw auditError(400, 'Invalid reinspection query.');
    const fresh = await authority(req), before = signature(fresh), row = await parent(fresh, id), read = await scope(fresh), filter = await getAuditScopeFilter(read);
    const window = require('./auditQuery.service').pagination(req, 10);
    if (window.limit > 50)
        throw auditError(400, 'Invalid reinspection page size.');
    const links = await Link.aggregate([{ $match: { kind: 'link', $or: [{ parentAuditId: row._id }, { childAuditId: row._id }] } }, { $lookup: { from: Audit.collection.name, localField: 'parentAuditId', foreignField: '_id', as: 'parent', pipeline: [{ $match: filter }, { $project: { id: 1, date: 1, status: 1 } }] } }, { $lookup: { from: Audit.collection.name, localField: 'childAuditId', foreignField: '_id', as: 'child', pipeline: [{ $match: filter }, { $project: { id: 1, date: 1, status: 1 } }] } }, { $match: { 'parent.0': { $exists: true }, 'child.0': { $exists: true } } }, { $sort: { createdAt: -1, _id: -1 } }, { $facet: { items: [{ $skip: window.skip }, { $limit: window.limit }], total: [{ $count: 'count' }] } }]).option({ maxTimeMS: 5000 });
    let canCreate = false;
    try {
        await scope(fresh, 'create', row.auditType);
        canCreate = await eligible(row);
    }
    catch { /* no independent create grant */ }
    if (signature(await authority(req)) !== before || version(await parent(fresh, id)) !== version(row))
        throw auditError(409, 'Audit context changed.');
    const total = links[0].total[0]?.count || 0;
    return { version: version(row), eligible: await eligible(row), canCreate, page: window.page, total, hasMore: window.skip + links[0].items.length < total, items: links[0].items.map(v => ({ id: v._id, parent: v.parent[0], child: v.child[0], actorId: v.actorId, at: v.createdAt })) };
}
module.exports = { create, list, version };
