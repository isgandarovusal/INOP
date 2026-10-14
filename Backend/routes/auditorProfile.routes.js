const router = require('express').Router();
const mongoose = require('mongoose');
const { authorize } = require('../middleware/authorization.middleware');
const Profile = require('../models/auditorProfile.model');
const { changeDirection } = require('../services/auditorProfile.service');
const managersOnly = (req, res, next) => ['admin', 'audit_manager'].includes(req.user.role) && req.permission.scope === 'all'
  ? next() : res.status(403).json({ message: 'Audit profile management requires explicit management permission.' });
router.get('/me', ...authorize('audit', 'read'), async (req, res) => res.json({ success: true, data: await Profile.findById(req.user.id).lean() }));
router.get('/:userId', ...authorize('audit.assignment', 'read'), managersOnly, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid user id.' });
  res.json({ success: true, data: await Profile.findById(req.params.userId).lean() });
});
router.put('/:userId', ...authorize('audit.assignment', 'update'), managersOnly, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid user id.' });
  try { res.json({ success: true, data: await changeDirection(req.params.userId, req.body.direction, req.user.id, req.body.reason) }); }
  catch (error) { res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.status ? error.message : 'Audit profile update failed.' }); }
});
module.exports = router;
