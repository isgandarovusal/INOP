const mongoose = require('mongoose');

const AuditFileSchema = new mongoose.Schema(
  {
    name: String,
    size: Number,
    blobUrl: String,
    file: String,
    fileName: String,
    mimeType: String,
    url: String,
  },
  { _id: false }
);

const AuditSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    restaurantId: {
      type: String,
      required: true,
      index: true,
    },

    auditorId: {
      type: String,
      default: 'unknown',
    },

    auditType: {
      type: String,
      required: true,
      enum: ['service', 'standard', 'occupational-safety', 'regular', 'hygiene', 'quality', 'safety', 'Routine', 'Follow-up', 'Surprise', 'Complaint-driven'],
      index: true,
    },

    date: {
      type: String,
      required: true,
    },

    shift: String,

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'in-progress', 'completed', 'failed', 'cancelled'],
      default: 'draft',
    },

    deletedAt: { type: Date, default: null, index: true },
    mutationLock: { type: new mongoose.Schema({ token: String, expiresAt: Date }, { _id: false }), select: false },
    createdBy: { type: String, index: true },
    departmentId: { type: String, index: true },
    templateId: String,
    templateSnapshot: mongoose.Schema.Types.Mixed,
    results: { type: Array, default: [] },
    categories: { type: Array, default: [] },
    foundCritical: { type: Number, min: 0, default: 0 },
    foundMajor: { type: Number, min: 0, default: 0 },
    foundMinor: { type: Number, min: 0, default: 0 },
    foundTotal: { type: Number, min: 0, default: 0 },
    compliancePercentage: { type: Number, min: 0, max: 100, default: 0 },
    passed: { type: Boolean, default: false },
    totalScore: { type: Number, min: 0, default: 0 },
    maxScore: { type: Number, min: 0, default: 0 },
    scorePercentage: { type: Number, min: 0, max: 100, default: 0 },
    safetyDetails: mongoose.Schema.Types.Mixed,
    template: mongoose.Schema.Types.Mixed,

    scores: mongoose.Schema.Types.Mixed,

    checks: {
      type: Array,
      default: [],
    },

    serviceTimeObservations: {
      type: Array,
      default: [],
    },

    findings: {
      type: Array,
      default: [],
    },

    recommendations: {
      type: Array,
      default: [],
    },

    overallPercentage: {
      type: Number,
      default: 0,
    },

    comments: {
      type: String,
      default: '',
    },

    photos: {
      type: [AuditFileSchema],
      default: [],
    },

    attachments: {
      type: [AuditFileSchema],
      default: [],
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

AuditSchema.index({ deletedAt: 1, date: -1, createdAt: -1, _id: -1 });
AuditSchema.index({ deletedAt: 1, auditorId: 1, date: -1, createdAt: -1, _id: -1 });
AuditSchema.index({ deletedAt: 1, createdBy: 1, date: -1, createdAt: -1, _id: -1 });
AuditSchema.index({ deletedAt: 1, departmentId: 1, date: -1, createdAt: -1, _id: -1 });
AuditSchema.index({ auditType: 1, status: 1, date: -1 });

module.exports =
  mongoose.models.Audit ||
  mongoose.model('Audit', AuditSchema);
