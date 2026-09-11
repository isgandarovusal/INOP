const mongoose = require("mongoose");

const AuditSourceDocumentSchema = new mongoose.Schema(
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

    auditType: {
      type: String,
      enum: ["service", "standard", "occupational-safety"],
      required: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
    },

    storageKey: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded",
    },

    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    uploadedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

AuditSourceDocumentSchema.index({
  brandId: 1,
  auditType: 1,
  createdAt: -1,
});

module.exports =
  mongoose.models.AuditSourceDocument ||
  mongoose.model("AuditSourceDocument", AuditSourceDocumentSchema);
