// This module never loads .env files, connects to a service or serializes values.
function configuration(env = process.env, nodeVersion = process.versions.node) {
  const issues = [];
  if (Number(nodeVersion.split('.')[0]) !== 24) issues.push('NODE_MAJOR_UNSUPPORTED');
  const port = env.PORT === undefined ? 3001 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || (env.PORT !== undefined && (typeof env.PORT !== 'string' || /\D/.test(env.PORT) || !env.PORT.length))) issues.push('PORT_INVALID');
  const mongoUri = env.MONGO_URI || env.CS;
  if (typeof mongoUri !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) issues.push('DATABASE_BINDING_INVALID');
  if ((env.NODE_ENV === 'production' || env.RENDER === 'true') && (typeof env.JWT_SECRET !== 'string' || !env.JWT_SECRET.trim())) issues.push('AUTH_BINDING_MISSING');
  if (issues.length) throw Object.assign(new Error('Backend runtime configuration is invalid.'), { code: 'RUNTIME_CONFIGURATION_INVALID', issues });
  return Object.freeze({ port, mongoUri });
}
function publicRuntime(env = process.env, nodeVersion = process.versions.node) {
  const names = ['RENDER_GIT_COMMIT', 'INOP_BUILD_SHA'];
  const source = names.find(name => typeof env[name] === 'string' && env[name].length === 40 && /^[a-f0-9]{40}$/i.test(env[name]));
  return { contractVersion: 1, nodeMajor: Number(nodeVersion.split('.')[0]), gitSha: source ? env[source].toLowerCase() : null, gitShaSource: source || null };
}
module.exports = { configuration, publicRuntime };
