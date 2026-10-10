const mongoose = require("mongoose");

const AuditSourceDocumentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
      index: true,
    },

    templateId: {
      type: String,
      default: "",
      index: true,
    },

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
      enum: [
        "service",
        "standard",
        "occupational-safety",
      ],
      default: "service",
      index: true,
    },

    fileName: {
      type: String,
      default: "",
      trim: true,
    },

    name: {
      type: String,
      default: "",
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

    filePath: {
      type: String,
      default: "",
    },

    storageKey: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "uploaded",
        "processing",
        "processed",
        "failed",
      ],
      default: "uploaded",
    },

    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    uploadedBy: {
      type: String,
      default: "",
      index: true,
    },
    departmentId: { type: String, default: "", trim: true, index: true },
    assignedTo: { type: String, default: "", trim: true, index: true },
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
AuditSourceDocumentSchema.index({ fileName: 1 });
AuditSourceDocumentSchema.index({ departmentId: 1, createdAt: -1 });
AuditSourceDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
AuditSourceDocumentSchema.index({ assignedTo: 1, createdAt: -1 });


module.exports =
  mongoose.models.AuditSourceDocument ||
  mongoose.model(
    "AuditSourceDocument",
    AuditSourceDocumentSchema
  );
