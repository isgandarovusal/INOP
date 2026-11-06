// Server-owned capability; HTTP JSON cannot supply this Symbol.
const key = Symbol('audit-creation-session');
const run = (operation, session) => session ? operation(session) : require('./auditTransaction.service').transaction(operation);
module.exports = { key, run };
