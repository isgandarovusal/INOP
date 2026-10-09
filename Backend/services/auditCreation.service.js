const mongoose = require('mongoose');
const Audit = require('../models/audit.model');
const Snapshot = require('../models/auditDepartmentSnapshot.model');

exports.createAuditWithDepartmentSnapshot = async (payload, user) => {
  if (!user?.id) throw new Error('Authenticated audit author is required');
  // Public id remains unchanged; internal identity and provenance are server-owned.
  const auditId = new mongoose.Types.ObjectId();
  await Snapshot.create({
    auditId,
    auditorId: user.id,
    departmentId: user.departmentId || null,
  });
  try {
    // Publish the audit only after its immutable authorization snapshot exists.
    return await Audit.create({ ...payload, _id: auditId, auditorId: user.id });
  } catch (error) {
    try {
      await Snapshot.deleteOne({ auditId });
    } catch (cleanupError) {
      // An orphan snapshot cannot expose data: its audit was never published.
      console.error('Audit snapshot cleanup failed:', cleanupError);
    }
    throw error;
  }
};
