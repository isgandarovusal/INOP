const mongoose = require("mongoose");
const { creationEvent } = require("../services/applicationLifecycle.service");
const { scoreResponses } = require("../services/applicationScoreState.service");
const { decorateApplications } = require("../services/recruitmentCatalog.service");
const { recordActivity } = require("../services/activityLog.service");
const Application = require("../models/application.model");
const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const { resourceFilter, applicationParents } = require('../services/hrResourceScope.service');
const {
  calculateApplicationMatch,
} = require("../services/applicationMatch.service");


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
      .select("-events")
      .populate(applicationParents(req))
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(await decorateApplications(req, await scoreResponses(req, applications)));
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
      .select("-events")
      .populate(applicationParents(req))
      .lean();

    if (!application) {
      return res.status(404).json({
        message:
          "Müraciət tapılmadı və ya bu müraciətə giriş icazəniz yoxdur.",
      });
    }

    return res.status(200).json((await decorateApplications(req, await scoreResponses(req, [application])))[0]);
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

    if (typeof notes !== "string" || notes.length > 5000) return res.status(400).json({ message: "Notes must be text up to 5000 characters." });
    if (!validateObjectId(jobId) || !validateObjectId(candidateId)) {
      return res.status(400).json({
        message: "Job və Candidate ID-ləri düzgün deyil.",
      });
    }

    const [job, candidate] = await Promise.all([
      Job.findOne({ $and: [{ _id: jobId }, resourceFilter(req, 'recruitment')] }),
      Candidate.findOne({ $and: [{ _id: candidateId }, resourceFilter(req, 'candidate')] }),
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

    if (job.status !== "Open") return res.status(409).json({ message: "This vacancy is not accepting applications.", code: "JOB_NOT_OPEN" });
    const existing = await Application.findOne({
      jobId,
      candidateId,
    });

    if (existing) {
      return res.status(409).json({
        message: "Bu namizəd artıq həmin vakansiyaya müraciət edib.",
      });
    }

    const application = new Application({ jobId, candidateId,
      departmentId: req.user?.departmentId || '', createdBy: req.user?.id || null, assignedTo: req.user?.id || null,
      notes: notes.trim(), events: [creationEvent(req)] });
    const matchResult = calculateApplicationMatch(job, candidate, { application });
    application.matching = matchResult; application.score = matchResult.score; application.scoreStatus = matchResult.scoreStatus;

    const saved = await application.save();

    const populated = await Application.findById(saved._id)
      .populate(applicationParents(req))
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
        activityError
      );
    }

    return res.status(201).json((await decorateApplications(req, await scoreResponses(req, [populated])))[0]);
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

exports.updateApplicationStatus = require('./applicationWorkflow.controller').update;

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
        activityError
      );
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
