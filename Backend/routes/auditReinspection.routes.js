const router = require('express').Router(), { authorize } = require('../middleware/authorization.middleware'), { requireAuditParentAccess } = require('../middleware/auditScope.middleware'), service = require('../services/auditReinspection.service');
router.get('/:auditId', ...authorize('audit', 'read'), requireAuditParentAccess, async (req, res) => { try {
    res.json(await service.list(req, req.auditScopeId));
}
catch (e) {
    res.status(e.status || 500).json({ message: 'Audit reinspection context is unavailable.' });
} });
router.post('/:auditId', ...authorize('audit', 'read'), requireAuditParentAccess, async (req, res) => { try {
    const r = await service.create(req, req.auditScopeId, req.body);
    res.status(r.replayed ? 200 : 201).json({ id: r.audit.id });
}
catch (e) {
    res.status(e.status || 500).json({ message: 'Audit reinspection could not be created.' });
} });
module.exports = router;
