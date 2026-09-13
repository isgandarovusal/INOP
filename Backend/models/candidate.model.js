const mongoose = require("mongoose");

const candidateStatusValues = [
  "new",
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

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
      enum: candidateStatusValues,
      default: "applied",
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    education: {
      type: String,
      default: "",
      trim: true,
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

    languages: {
      type: [String],
      default: [],
    },

    certificates: {
      type: [String],
      default: [],
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

module.exports.candidateStatusValues = candidateStatusValues;
