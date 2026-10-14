// Audit organization identity is independent of the Recruitment catalog.
const organization = Object.freeze({ id: 'gfc', name: 'GFC' });
const brands = Object.freeze([
  Object.freeze({ id: 'kfc', name: 'KFC', organizationId: 'gfc' }),
  Object.freeze({ id: 'pizza-hut', name: 'Pizza Hut', organizationId: 'gfc' }),
  Object.freeze({ id: 'simit-sarayi', name: 'Simit Sarayı', organizationId: 'gfc' }),
]);
const brandIds = Object.freeze(brands.map(brand => brand.id));
function relationErrors({ organizationId, brandId }) {
  const errors = {};
  if (organizationId != null && organizationId !== organization.id) errors.organizationId = 'Unknown audit organization.';
  if (brandId != null && !brandIds.includes(brandId)) errors.brandId = 'Unknown audit brand.';
  if (brandId != null && organizationId !== organization.id) errors.organizationId = 'A brand requires organization gfc.';
  return errors;
}
exports.organization = organization;
exports.brands = brands;
exports.brandIds = brandIds;
exports.relationErrors = relationErrors;
exports.getCatalog = () => ({ organizations: [organization], brands });
