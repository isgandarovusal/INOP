const mongoose = require("mongoose");

const auditClosureSchema = new mongoose.Schema(
  {
    auditId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Audit",
      required: true
    },

    executionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditExecution"
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    finalStatus: {
      type: String,
      enum: ["completed", "reopened", "rejected"],
      default: "completed"
    },

    comment: {
      type: String,
      default: ""
    },

    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    closedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "AuditClosure",
  auditClosureSchema
);
