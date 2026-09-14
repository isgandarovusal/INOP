const mongoose = require("mongoose");

const notificationLogSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["email"],
      default: "email",
      index: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    recipient: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["sent", "skipped", "failed"],
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    providerMessageId: {
      type: String,
      default: "",
      trim: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
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
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.NotificationLog ||
  mongoose.model("NotificationLog", notificationLogSchema);
