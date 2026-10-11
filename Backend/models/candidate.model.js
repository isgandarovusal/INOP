const mongoose = require("mongoose");

const candidateStatusValues = [
  "new",
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: candidateStatusValues,
      default: "applied",
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },
    phoneRaw: { type: String, default: "", maxlength: 80 },
    // Server-only opaque reference. Never accepted from Candidate request bodies.
    // No default migration; records without it retain authorized legacy reads.
    privateCvBlob: {
      type: new mongoose.Schema({
        provider: { type: String, enum: ['s3'], required: true },
        key: { type: String, required: true }, sha256: { type: String, required: true },
        size: { type: Number, required: true }, mimeType: { type: String, required: true },
      }, { _id: false }),
      select: false,
      validate: value => { try { require('../services/hrPrivateObjectStorage.service').reference(value.toObject ? value.toObject() : value); return true; } catch { return false; } },
    },
    privateCvIntake: {type:mongoose.Schema.Types.ObjectId,select:false},
    privateCvArchive: {
      type: new mongoose.Schema({manifestId:mongoose.Schema.Types.ObjectId,attachedBy:mongoose.Schema.Types.ObjectId,attachedAt:Date},{_id:false}),
      select:false,
    },
    cvOriginal: {
      originalName: String, mimeType: String, size: Number, sha256: String,
    },
    cvReview: {
      version: String, provider: String, confidenceKind: String,
      processingStatus: { type: String, enum: ['extracted', 'unsupported_ocr', 'failed'] },
      reviewStatus: { type: String, enum: ['pending', 'confirmed', 'corrected'] },
      provenance: new mongoose.Schema({provider:String,model:String,mode:{type:String,enum:['live','mock_test_only']},contextHash:String},{_id:false}),
      fields: mongoose.Schema.Types.Mixed, warnings: [String], correctedFields: [String],
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewedAt: Date,
      processingApproval: new mongoose.Schema({
        jobId: mongoose.Schema.Types.ObjectId, parserVersion: String,
        sourceHash: String, sourceContextHash: String, sourceRevision: Number,
        resultHash: String, approvedFields: [String], profileHash: String,
        approvedBy: {type:mongoose.Schema.Types.ObjectId,ref:"User"}, approvedAt: Date,
      }, { _id: false }),
    },
    employmentHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    educationHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    certificationHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },

    education: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedFields: { type: [String], default: [] },
    skills: {
      type: [String],
      default: [],
    },

    experience: {
      type: Number,
      default: null,
      min: 0,
    },

    languages: {
      type: [String],
      default: [],
    },

    certificates: {
      type: [String],
      default: [],
    },

    cvUrl: {
      type: String,
      default: "",
      trim: true,
    },

    /*
     * Authorization / data-scope fields.
     *
     * departmentId:
     *   Candidate hansı department-ə aiddir.
     *
     * createdBy:
     *   Candidate record-unu kim yaradıb.
     *
     * assignedTo:
     *   Candidate hazırda kimə təyin olunub.
     */
    departmentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, value) => { delete value.privateCvBlob; delete value.privateCvArchive; delete value.privateCvIntake; return value; } },
  }
);

// Scoped newest-page traversal; DDL is verified only in isolated local DBs.
candidateSchema.index({ createdAt: -1, _id: -1 });
candidateSchema.index({ createdBy: 1, createdAt: -1, _id: -1 });
candidateSchema.index({ departmentId: 1, createdAt: -1, _id: -1 });
candidateSchema.index({ assignedTo: 1, createdAt: -1, _id: -1 });

module.exports =
  mongoose.models.Candidate ||
  mongoose.model("Candidate", candidateSchema);

module.exports.candidateStatusValues = candidateStatusValues;
