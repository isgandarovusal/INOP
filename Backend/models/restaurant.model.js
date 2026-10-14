const mongoose = require('mongoose');
const { brandIds, relationErrors } = require('../services/auditCatalog.service');

const restaurantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      default: '',
    },

    // No defaults: existing records and legacy JSON remain unchanged.
    organizationId: { type: String, enum: ['gfc', null] },
    brandId: { type: String, enum: [...brandIds, null] },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

restaurantSchema.pre('validate', function () {
  for (const [field, message] of Object.entries(relationErrors(this))) this.invalidate(field, message);
});

// Query writes must supply the complete pair; otherwise a partial update could
// bypass document cross-field validation. API updates merge the stored pair.
restaurantSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  const update = this.getUpdate();
  if (Array.isArray(update)) throw new Error('Restaurant update pipelines are unsupported.');
  const fields = ['organizationId', 'brandId'];
  const relationPath = path => fields.some(field => path === field || path.startsWith(field + '.'));
  const operators = Object.entries(update || {});
  const touchesRelation = operators.some(([key, value]) => relationPath(key) ||
    (key.startsWith('$') && (Object.keys(value || {}).some(relationPath) ||
      (key === '$rename' && Object.values(value || {}).some(value => typeof value === 'string' && relationPath(value))))));
  if (!touchesRelation) return;
  const pair = update.$set || update;
  const unsupported = operators.some(([operator, values]) => operator.startsWith('$') && operator !== '$set' &&
    (Object.keys(values || {}).some(relationPath) ||
      (operator === '$rename' && Object.values(values || {}).some(value => typeof value === 'string' && relationPath(value)))));
  if (!fields.every(field => Object.hasOwn(pair, field)) || unsupported ||
      Object.keys(pair).some(path => relationPath(path) && !fields.includes(path))) {
    const error = new mongoose.Error.ValidationError();
    error.addError('brandId', new mongoose.Error.ValidatorError({ path: 'brandId', message: 'Supply the complete relationship pair using $set.' }));
    throw error;
  }
  const errors = relationErrors(pair);
  if (Object.keys(errors).length) {
    const error = new mongoose.Error.ValidationError();
    for (const [field, message] of Object.entries(errors)) error.addError(field, new mongoose.Error.ValidatorError({ path: field, message }));
    throw error;
  }
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
