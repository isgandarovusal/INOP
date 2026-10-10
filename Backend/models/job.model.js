const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    deletedAt: { type: Date, default: null, index: true },
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

jobSchema.index({ deletedAt: 1, departmentId: 1, createdAt: -1, _id: -1 });
jobSchema.index({ deletedAt: 1, createdAt: -1, _id: -1 });
jobSchema.index({ deletedAt: 1, assignedTo: 1, createdAt: -1, _id: -1 });
jobSchema.index({ deletedAt: 1, createdBy: 1, createdAt: -1, _id: -1 });

module.exports =
  mongoose.models.Job ||
  mongoose.model("Job", jobSchema);
