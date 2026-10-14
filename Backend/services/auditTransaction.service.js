const mongoose = require('mongoose');
function auditError(status, message) { return Object.assign(new Error(message), { status }); }
async function transaction(operation) {
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') throw auditError(503, 'Audit writes require a transaction-capable MongoDB deployment.');
  const session = await mongoose.startSession();
  try { let value; await session.withTransaction(async () => { value = await operation(session); }); return value; }
  finally { await session.endSession(); }
}
module.exports = { transaction, auditError };
