const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    brandId: { type: String, default: null, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "RecruitmentBranch", default: null, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    departmentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    location: {
      type: String,
      default: "Remote",
      trim: true,
    },

    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    requiredSkills: {
      type: [String],
      default: [],
    },

    preferredSkills: {
      type: [String],
      default: [],
    },

    requiredEducation: { type: [String], default: [] },
    requiredCertificates: { type: [String], default: [] },
    criterionWeights: { type: mongoose.Schema.Types.Mixed, default: {} },
    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Open", "Closed", "Draft"],
      default: "Open",
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
  }
);

// Scoped newest-page traversal; DDL is verified only in isolated local DBs.
jobSchema.index({ createdAt: -1, _id: -1 });
jobSchema.index({ createdBy: 1, createdAt: -1, _id: -1 });
jobSchema.index({ departmentId: 1, createdAt: -1, _id: -1 });
jobSchema.index({ assignedTo: 1, createdAt: -1, _id: -1 });
jobSchema.index({ brandId: 1, branchId: 1, status: 1, createdAt: -1, _id: -1 });

module.exports =
  mongoose.models.Job ||
  mongoose.model("Job", jobSchema);
