const directions = Object.freeze(['hr', 'service', 'standard', 'occupational-safety']);
const canonicalDirection = value => value === 'safety' ? 'occupational-safety' : directions.includes(value) ? value : null;
const aliasesFor = direction => direction === 'occupational-safety' ? ['occupational-safety', 'safety'] : [direction];
module.exports = { directions, canonicalDirection, aliasesFor };
