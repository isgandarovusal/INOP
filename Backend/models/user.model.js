const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
