const mongoose = require("mongoose");

const AuditQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    answerType: {
      type: String,
      enum: ["yes-no-na", "severity", "score", "text"],
      default: "yes-no-na",
    },
    required: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const AuditSubsectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    questions: {
      type: [AuditQuestionSchema],
      default: [],
    },
  },
  { _id: false }
);

const AuditSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    subsections: {
      type: [AuditSubsectionSchema],
      default: [],
    },
    questions: {
      type: [AuditQuestionSchema],
      default: [],
    },
  },
  { _id: false }
);

const AuditTemplateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: String,
      default: "",
      index: true,
    },

    brandId: {
      type: String,
      default: "",
      index: true,
    },

    brandName: {
      type: String,
      required: true,
      trim: true,
    },

    auditType: {
      type: String,
      enum: ["service", "standard", "occupational-safety"],
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    version: {
      type: String,
      default: "1.0",
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },

    sections: {
      type: [AuditSectionSchema],
      default: [],
    },

    sourceDocumentIds: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: String,
      default: "",
    },

    updatedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

AuditTemplateSchema.index({
  brandId: 1,
  auditType: 1,
  status: 1,
});

module.exports =
  mongoose.models.AuditTemplate ||
  mongoose.model("AuditTemplate", AuditTemplateSchema);
