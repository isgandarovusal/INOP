const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const restaurantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: () => `rest-${randomUUID()}`,
      maxlength: 200,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    departmentId: { type: String, trim: true, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  }
);

restaurantSchema.index({ deletedAt: 1, createdAt: -1, _id: -1 });
restaurantSchema.index({ deletedAt: 1, departmentId: 1, createdAt: -1, _id: -1 });
restaurantSchema.index({ deletedAt: 1, createdBy: 1, createdAt: -1, _id: -1 });
restaurantSchema.index({ deletedAt: 1, assignedTo: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
