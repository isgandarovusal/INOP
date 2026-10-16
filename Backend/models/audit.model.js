const mongoose = require('mongoose');

const AuditFileSchema = new mongoose.Schema(
  {
    name: String,
    size: Number,
    blobUrl: String,
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
      required: function(){return !this.hseObjectType||this.hseObjectType==='restaurant';},
      index: true,
    },

    auditorId: {
      type: String,
      default: 'unknown',
    },

    auditType: {
      type: String,
      required: true,
      index: true,
    },

    date: {
      type: String,
      required: true,
    },

    shift: String,

    status: {
      type: String,
      default: 'completed',
    },

    templateId: String,
    templateRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditTemplateRevision' },
    templateSnapshot: mongoose.Schema.Types.Mixed,
    // Optional source-bound fields need declared paths so draft assignments are
    // persisted; strict:false alone does not track assignment to unknown paths.
    standardRestaurantSnapshot:{type:mongoose.Schema.Types.Mixed,immutable:true},
    standardAuditorSnapshot:{type:mongoose.Schema.Types.Mixed,immutable:true},
    hseObjectType:{type:String,enum:['restaurant','office','warehouse'],immutable:true},
    hseObjectId:{type:String,immutable:true},
    hseObjectSnapshot:{type:mongoose.Schema.Types.Mixed,immutable:true},
    hseSubmission:mongoose.Schema.Types.Mixed,
    hseAssessment:mongoose.Schema.Types.Mixed,
    hseDetails:mongoose.Schema.Types.Mixed,
    standardSubmission: mongoose.Schema.Types.Mixed,
    standardAssessment: mongoose.Schema.Types.Mixed,
    standardDetails: mongoose.Schema.Types.Mixed,
    serviceAssessment: mongoose.Schema.Types.Mixed,
    serviceDetails: mongoose.Schema.Types.Mixed,
    hrAssessment: mongoose.Schema.Types.Mixed,
    hrDetails: mongoose.Schema.Types.Mixed,
    assessmentStatus: { type: String, enum: ['legacy-unscored','unscored','scored'] },
    passed: Boolean,
    archivedAt: Date,
    archivedBy: String,
    auditWriteVersion: Number,
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
    strict: false,
  }
);

module.exports =
  mongoose.models.Audit ||
  mongoose.model('Audit', AuditSchema);
