const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    userName: {
      type: String,
      default: "",
      trim: true,
    },
    departmentId: {
      type: String,
      default: "",
      trim: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },

    entityType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    entityId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ departmentId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);
