const mongoose = require("mongoose");

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
      enum: ["applied", "interview", "offer", "rejected"],
      default: "applied",
    },

    skills: {
      type: [String],
      default: [],
    },

    experience: {
      type: Number,
      default: 0,
      min: 0,
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
  }
);

module.exports =
  mongoose.models.Candidate ||
  mongoose.model("Candidate", candidateSchema);
