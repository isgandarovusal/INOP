const mongoose = require('mongoose');
const Role = require('../models/role.model');
const User = require('../models/user.model');

// Serialize destructive identity transitions across processes on the existing
// authority record. A count outside this transaction permits write skew when
// two different administrators are removed at the same time. No new singleton,
// collection or startup write is needed; ordinary profile reads/edits stay free.
exports.change = async (query, removesAdmin, operation) => mongoose.connection.transaction(async session => {
  const lock = await Role.updateOne({ key: 'admin' }, { $inc: { __v: 1 } }, { session, timestamps: false });
  if (lock.matchedCount !== 1) throw Object.assign(new Error('Administrator authority is unavailable.'), { code: 'ADMIN_AUTHORITY_UNAVAILABLE', status: 503 });
  const current = await User.findOne(query).session(session).lean();
  if (current?.role === 'admin' && current.isActive && removesAdmin(current) &&
      await User.countDocuments({ role: 'admin', isActive: true }).session(session) <= 1) {
    throw Object.assign(new Error('Son aktiv administrator silinə, deaktiv edilə və ya başqa rola keçirilə bilməz.'), { code: 'LAST_ACTIVE_ADMIN', status: 409 });
  }
  return operation(session, current);
});
