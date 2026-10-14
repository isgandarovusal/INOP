const { brands, relationErrors } = require('./auditCatalog.service');
const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
function previewMapping({ restaurants, audits = [] }) {
  if (!Array.isArray(restaurants) || !Array.isArray(audits)) throw new TypeError('Expected restaurants and audits arrays.');
  const ids = new Map(), names = new Map();
  const rows = restaurants.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Invalid restaurant record.');
    const issues = [];
    if (typeof record.id !== 'string' || !record.id.trim()) issues.push('missing-id');
    const name = normalize(record.name);
    if (!name) issues.push('missing-name');
    const candidates = brands.filter(brand => new RegExp('(^| )' + normalize(brand.name) + '( |$)').test(name)).map(brand => brand.id);
    const errors = relationErrors(record);
    if (Object.keys(errors).length) issues.push('invalid-relation');
    if (candidates.length > 1) issues.push('ambiguous-name');
    if (record.brandId && candidates.length && !candidates.includes(record.brandId)) issues.push('name-link-conflict');
    const row = { index, restaurantId: record.id ?? null, currentOrganizationId: record.organizationId ?? null, currentBrandId: record.brandId ?? null, candidateBrandIds: candidates, issues };
    for (const [map, key] of [[ids, record.id], [names, name]]) {
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return row;
  });
  for (const group of ids.values()) if (group.length > 1) for (const row of group) row.issues.push('duplicate-id');
  for (const group of names.values()) if (group.length > 1) for (const row of group) row.issues.push('duplicate-name-review');
  for (const row of rows) row.status = row.issues.length ? 'conflict' : row.currentBrandId ? 'linked' : row.candidateBrandIds.length === 1 ? 'review-required' : 'unknown';
  const orphanAudits = audits.filter(audit => !ids.has(audit.restaurantId)).map(audit => ({ auditId: audit.id ?? null, restaurantId: audit.restaurantId ?? null }));
  return { dryRun: true, writes: 0, rows, unknown: rows.filter(row => row.status === 'unknown'), conflicts: rows.filter(row => row.status === 'conflict'), reviewRequired: rows.filter(row => row.status === 'review-required'), orphanAudits };
}
module.exports = { previewMapping };
