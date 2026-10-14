const Profile = require('../models/auditorProfile.model');
exports.requireAuditDirection = async (req, res, next) => {
  try {
    const profile = await Profile.findById(req.user.id).lean();
    if (req.user.role === 'auditor' || profile) {
      if (!profile?.active || profile.organizationId !== 'gfc') return res.status(403).json({ message: 'Active audit direction assignment is required.', code: 'AUDIT_DIRECTION_REQUIRED' });
      req.auditorProfile = profile;
    }
    next();
  } catch { res.status(500).json({ message: 'Audit direction check failed.' }); }
};
