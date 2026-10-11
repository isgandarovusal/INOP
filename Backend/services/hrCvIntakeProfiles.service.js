// Activation is intentionally server-only and default-disabled. Real private
// storage, malware scanning and recovery/retention approval must precede wiring.
exports.profile=()=>require('./hrCvIntake.service').createIntake();
