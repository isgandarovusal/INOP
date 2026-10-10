const mongoose = require("mongoose");
const { recordActivity } = require("../services/activityLog.service");
const Application = require("../models/application.model");
const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const { listRecords } = require("../utils/listQuery");
const { sendError } = require("../utils/sendError");
const { referenceScope } = require("../utils/referenceScope");
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
    const applications = await listRecords(Application, buildScopedQuery(req), req, res,
      { populate: ["jobId", "candidateId"] });

    return res.status(200).json(applications);
  } catch (error) {
    return sendError(res, error, "Müraciətlər alınarkən server xətası baş verdi.");
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
    console.error("Get application error:", error?.name || "Error");

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

    const [jobScope, candidateScope] = await Promise.all([
      referenceScope(req, "recruitment"), referenceScope(req, "candidate"),
    ]);
    const [job, candidate] = await Promise.all([
      Job.findOne({ _id: jobId, deletedAt: null, status: "Open", ...jobScope }),
      Candidate.findOne({ _id: candidateId, deletedAt: null, ...candidateScope }),
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

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "application",
        entityId: saved._id,
        description: `Müraciət yaradıldı: ${populated?.candidateId?.name || "Namizəd"} → ${populated?.jobId?.title || "Vakansiya"}`,
      });
    } catch (activityError) {
      console.error(
        "Application create activity log error:",
        activityError?.name || "Error");
    }

    return res.status(201).json(populated);
  } catch (error) {
    if (error.status === 403) return sendError(res, error);
    console.error("Create application error:", error.name);

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

    const existing = await Application.findOne(
      buildScopedQuery(req, {
        _id: req.params.id,
      })
    );

    if (!existing) {
      return res.status(404).json({
        message:
          "Müraciət tapılmadı və ya bu müraciəti dəyişmək üçün icazəniz yoxdur.",
      });
    }

    const updated = await Application.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: req.params.id,
        status: existing.status,
      }),
      { status },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("jobId")
      .populate("candidateId");

    if (!updated) {
      return res.status(409).json({
        message: "Application changed concurrently. Reload before updating its status.",
      });
    }

    if (existing.status !== updated.status) {
      try {
        await notifyCandidateStatus({
          application: updated,
          actor: req.user,
        });
      } catch (notificationError) {
        console.error(
          "Candidate status notification error:",
          notificationError?.name || "Error");
      }

      try {
        await recordActivity({
          req,
          action: "status_change",
          entityType: "application",
          entityId: updated._id,
          description: `Müraciət statusu dəyişdirildi: ${updated?.candidateId?.name || "Namizəd"} → ${updated?.jobId?.title || "Vakansiya"} (${existing.status} → ${updated.status})`,
        });
      } catch (activityError) {
        console.error(
          "Application status activity log error:",
          activityError?.name || "Error");
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update application status error:", error?.name || "Error");

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
    )
      .populate("jobId")
      .populate("candidateId");

    if (!deleted) {
      return res.status(404).json({
        message:
          "Müraciət tapılmadı və ya bu müraciəti silmək üçün icazəniz yoxdur.",
      });
    }

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "application",
        entityId: deleted._id,
        description: `Müraciət silindi: ${deleted?.candidateId?.name || "Namizəd"} → ${deleted?.jobId?.title || "Vakansiya"}`,
      });
    } catch (activityError) {
      console.error(
        "Application delete activity log error:",
        activityError?.name || "Error");
    }

    return res.status(200).json({
      message: "Müraciət silindi.",
    });
  } catch (error) {
    console.error("Delete application error:", error?.name || "Error");

    return res.status(500).json({
      message: "Müraciət silinərkən server xətası baş verdi.",
    });
  }
};
