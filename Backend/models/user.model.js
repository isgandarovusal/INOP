const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // Role is intentionally stored as a string rather than
    // a hard-coded enum so new roles can be introduced later.
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    departmentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    position: {
      type: String,
      default: "",
      trim: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ departmentId: 1, createdAt: -1 });
userSchema.index({ departmentId: 1, role: 1 });

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
