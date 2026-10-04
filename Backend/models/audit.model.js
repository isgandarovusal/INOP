const mongoose = require("mongoose");

const AuditFileSchema = new mongoose.Schema(
  {
    name: String,
    size: Number,
    blobUrl: String,
  },
  { _id: false },
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
      default: "unknown",
    },

    auditType: {
      type: String,
      enum: ["service", "standard", "occupational-safety"],
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
      enum: ["draft", "scheduled", "in-progress", "completed", "cancelled"],
      default: "draft",
    },

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
      default: "",
    },

    photos: {
      type: [AuditFileSchema],
      default: [],
    },

    attachments: {
      type: [AuditFileSchema],
      default: [],
    },

    departmentId: { type: String, default: "", index: true },
    revision: { type: Number, default: 0 },
    type: String,
    templateId: String,
    templateSnapshot: mongoose.Schema.Types.Mixed,
    checklist: { type: Array, default: [] },
    results: { type: Array, default: [] },
    categories: { type: Array, default: [] },
    foundCritical: Number,
    foundMajor: Number,
    foundMinor: Number,
    foundTotal: Number,
    compliancePercentage: Number,
    passed: Boolean,
    totalScore: Number,
    maxScore: Number,
    scorePercentage: Number,
    safetyDetails: mongoose.Schema.Types.Mixed,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

module.exports = mongoose.models.Audit || mongoose.model("Audit", AuditSchema);
