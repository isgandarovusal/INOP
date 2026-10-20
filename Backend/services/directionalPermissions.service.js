// Additive capabilities. Legacy RBAC grants and direction profiles remain valid.
const directions = ['hr', 'service', 'standard', 'occupational-safety'];
const direct = (permissions, resource, action) => permissions.find(p =>
  (p.resource === resource || p.resource === '*') && (p.action === action || p.action === '*'))?.scope || null;
function directionalResource(resource, direction) {
  if (resource === 'audit') return `audit.${direction}`;
  if (resource.startsWith('audit.')) return `audit.${direction}.${resource.slice(6)}`;
  if (resource === 'occupational_safety_audit' && direction === 'occupational-safety') return `audit.${direction}`;
  return null;
}
function scope(permissions, resource, action, direction) {
  const legacy = direct(permissions, resource, action);
  if (direction) {
    const key = directionalResource(resource, direction);
    const exact = key && permissions.find(p => p.resource === key && (p.action === action || p.action === '*'));
    return exact ? exact.scope : legacy;
  }
  if (legacy) return legacy;
  const scopes = directions.map(d => scope(permissions, resource, action, d));
  return ['all', 'department', 'assigned', 'own'].find(s => scopes.includes(s)) || null;
}
function requestDirection(req) {
  const base = req.baseUrl || '';
  if (/\/audit-hr(?:\/|$)/.test(base)) return 'hr';
  if (/\/audit-service(?:\/|$)/.test(base)) return 'service';
  if (/\/audit-standard(?:\/|$)/.test(base)) return 'standard';
  if (/\/(audit-hse|occupational-safety-audits|occupational-safety-details)(?:\/|$)/.test(base)) return 'occupational-safety';
  if (!['GET', 'HEAD'].includes(req.method)) {
    const direction = req.body?.auditType || req.body?.type;
    if (directions.includes(direction)) return direction;
    if (direction === 'safety') return 'occupational-safety';
  }
  return null;
}
module.exports = { directions, scope, directionalResource, requestDirection };
