const mongoose = require("mongoose");
const Application = require("../models/application.model");
const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const {
  calculateApplicationMatch,
} = require("../services/applicationMatch.service");
const {
  notifyCandidateStatus,
} = require("../services/candidateNotification.service");

function getScopeFilter(req) {
  return req.dataScope || {};
}

function buildScopedQuery(req, extra = {}) {
  return {
    ...extra,
    ...getScopeFilter(req),
  };
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.getApplications = async (req, res) => {
  try {
    const applications = await Application.find(
      buildScopedQuery(req)
    )
      .populate("jobId")
      .populate("candidateId")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(applications);
  } catch (error) {
    console.error("Get applications error:", error);

    return res.status(500).json({
      message: "Müraciətlər alınarkən server xətası baş verdi.",
    });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Müraciət ID-si düzgün deyil.",
      });
    }

    const application = await Application.findOne(
      buildScopedQuery(req, {
        _id: req.params.id,
      })
    )
      .populate("jobId")
      .populate("candidateId")
      .lean();

    if (!application) {
      return res.status(404).json({
        message:
          "Müraciət tapılmadı və ya bu müraciətə giriş icazəniz yoxdur.",
      });
    }

    return res.status(200).json(application);
  } catch (error) {
    console.error("Get application error:", error);

    return res.status(500).json({
      message: "Müraciət alınarkən server xətası baş verdi.",
    });
  }
};

exports.createApplication = async (req, res) => {
  try {
    const { jobId, candidateId, notes = "" } = req.body;

    if (!validateObjectId(jobId) || !validateObjectId(candidateId)) {
      return res.status(400).json({
        message: "Job və Candidate ID-ləri düzgün deyil.",
      });
    }

    const [job, candidate] = await Promise.all([
      Job.findOne(buildScopedQuery(req, { _id: jobId })),
      Candidate.findOne(buildScopedQuery(req, { _id: candidateId })),
    ]);

    if (!job) {
      return res.status(404).json({
        message: "Vakansiya tapılmadı və ya giriş icazəniz yoxdur.",
      });
    }

    if (!candidate) {
      return res.status(404).json({
        message: "Namizəd tapılmadı və ya giriş icazəniz yoxdur.",
      });
    }

    const existing = await Application.findOne({
      jobId,
      candidateId,
    });

    if (existing) {
      return res.status(409).json({
        message: "Bu namizəd artıq həmin vakansiyaya müraciət edib.",
      });
    }

    const matchResult = calculateApplicationMatch(
      job,
      candidate
    );

    const application = new Application({
      jobId,
      candidateId,
      departmentId: req.user?.departmentId || "",
      createdBy: req.user?.id || null,
      assignedTo: req.user?.id || null,
      score: matchResult.score,
      notes: String(notes).trim(),
    });

    const saved = await application.save();

    const populated = await Application.findById(saved._id)
      .populate("jobId")
      .populate("candidateId")
      .lean();

    return res.status(201).json(populated);
  } catch (error) {
    console.error("Create application error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu namizəd artıq həmin vakansiyaya müraciət edib.",
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Müraciət məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Müraciət yaradılarkən server xətası baş verdi.",
    });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Müraciət ID-si düzgün deyil.",
      });
    }

    const allowedStatuses = [
      "Applied",
      "Screening",
      "Shortlisted",
      "Interview",
      "Offered",
      "Hired",
      "Rejected",
    ];

    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Müraciət statusu düzgün deyil.",
      });
    }

    const application = await Application.findOne(
      buildScopedQuery(req, {
        _id: req.params.id,
      })
    );

    if (!application) {
      return res.status(404).json({
        message:
          "Müraciət tapılmadı və ya bu müraciəti dəyişmək üçün icazəniz yoxdur.",
      });
    }

    const statusChanged = application.status !== status;
    application.status = status;
    await application.save();

    const candidateStatusMap = {
      Applied: "applied",
      Screening: "screening",
      Shortlisted: "shortlisted",
      Interview: "interview",
      Offered: "offer",
      Hired: "hired",
      Rejected: "rejected",
    };

    await Candidate.updateOne(
      { _id: application.candidateId },
      { status: candidateStatusMap[status] }
    );

    const updated = await Application.findById(application._id)
      .populate("jobId")
      .populate("candidateId");

    if (statusChanged) {
      await notifyCandidateStatus({
        application: updated,
        actor: req.user,
      });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update application status error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Müraciət statusu düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Müraciət statusu yenilənərkən server xətası baş verdi.",
    });
  }
};

exports.deleteApplication = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Müraciət ID-si düzgün deyil.",
      });
    }

    const deleted = await Application.findOneAndDelete(
      buildScopedQuery(req, {
        _id: req.params.id,
      })
    );

    if (!deleted) {
      return res.status(404).json({
        message:
          "Müraciət tapılmadı və ya bu müraciəti silmək üçün icazəniz yoxdur.",
      });
    }

    return res.status(200).json({
      message: "Müraciət silindi.",
    });
  } catch (error) {
    console.error("Delete application error:", error);

    return res.status(500).json({
      message: "Müraciət silinərkən server xətası baş verdi.",
    });
  }
};
