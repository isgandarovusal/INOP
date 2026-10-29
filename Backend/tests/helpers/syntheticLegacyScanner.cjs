// Explicit test-only collaborator. Never a production activation or AV certification.
exports.withSyntheticLegacyScanner = async (h, callback) => {
  if (h.mongoose.connection.host !== '127.0.0.1' || !/^inop_audit_test_\d+_[a-f0-9]{12}$/.test(h.mongoose.connection.name)) throw Error('Owned loopback QA required');
  const profiles = require('../../services/hrCvIntakeProfiles.service'), previous = profiles.scanner;
  profiles.scanner = () => ({scan:async(bytes,context)=>({verdict:'clean',sha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex'),engine:'synthetic-test-only',version:'1'})});
  try { return await callback(h); } finally { profiles.scanner = previous; }
};
const {withAuditFixture}=require('./auditFixture.cjs');
exports.withScannedCvFixture=(callback,options)=>withAuditFixture(h=>exports.withSyntheticLegacyScanner(h,callback),options);
