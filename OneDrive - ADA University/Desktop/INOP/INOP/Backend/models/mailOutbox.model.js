const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    to: String,
    title: String,
    message: String,
    status: {
      type: String,
      enum: ["queued", "sending", "sent", "failed", "blocked"],
      default: "queued",
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: Date,
    lastError: String,
    sentAt: Date,
  },
  { timestamps: true },
);
schema.index({ status: 1, nextAttemptAt: 1 });
module.exports = mongoose.model("MailOutbox", schema);
