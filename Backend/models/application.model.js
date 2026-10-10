const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

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

    events: { type: [mongoose.Schema.Types.Mixed], default: [] },
    interview: { type: mongoose.Schema.Types.Mixed, default: null },
    nextAction: { type: mongoose.Schema.Types.Mixed, default: null },
    substatus: { type: String, default: "" },
    stageEnteredAt: { type: Date, default: Date.now },
    processingState: { type: String, enum: ["idle", "queued", "running", "completed", "failed", "unsupported"], default: "idle" },
    matching: { type: mongoose.Schema.Types.Mixed, default: null },
    scoreStatus: { type: String, default: "pending", enum: ["pending", "incomplete", "calculated", "stale", "legacy"] },
    matchingReview: { type: mongoose.Schema.Types.Mixed, default: null },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: [
        "Applied",
        "Screening",
        "Shortlisted",
        "Interview",
        "Offered",
        "Hired",
        "Rejected",
      ],
      default: "Applied",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index(
  { jobId: 1, candidateId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);
