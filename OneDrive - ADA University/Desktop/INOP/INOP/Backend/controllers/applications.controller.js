const mongoose = require("mongoose");
const Application = require("../models/application.model");
const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
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
    const applications = await Application.find(buildScopedQuery(req))
      .populate(
        "jobId",
        "title department location type status requiredSkills preferredSkills experienceYears",
      )
      .populate("candidateId", "name role email skills experience status")
      .sort({ createdAt: -1, _id: -1 })
      .skip(req.pageOffset || 0)
      .limit(req.pageLimit || 100)
      .lean();

    return res
      .status(200)
      .json(
        applications.map((a) => ({
          ...a,
          score:
            a.jobId && a.candidateId
              ? calculateApplicationMatch(a.jobId, a.candidateId).score
              : 0,
          matchVersion: "skills-v1",
        })),
      );
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
      }),
    )
      .populate(
        "jobId",
        "title department location type status requiredSkills preferredSkills experienceYears",
      )
      .populate("candidateId", "name role email skills experience status")
      .lean();

    if (!application) {
      return res.status(404).json({
        message: "Müraciət tapılmadı və ya bu müraciətə giriş icazəniz yoxdur.",
      });
    }

    if (application.jobId && application.candidateId)
      application.score = calculateApplicationMatch(
        application.jobId,
        application.candidateId,
      ).score;
    return res.status(200).json(application);
  } catch (error) {
    console.error("Get application error:", error);

    return res.status(500).json({
      message: "Müraciət alınarkən server xətası baş verdi.",
    });
  }
};

exports.createApplication = async (req, res, next) => {
  try {
    let saved;
    await mongoose.connection.transaction(async (session) => {
      const job = await Job.findOneAndUpdate(
        buildScopedQuery(req, { _id: req.body.jobId, status: "Open" }),
        { $inc: { __v: 1 } },
        { new: true, session },
      );
      const candidate = await Candidate.findOneAndUpdate(
        buildScopedQuery(req, { _id: req.body.candidateId }),
        { $inc: { __v: 1 } },
        { new: true, session },
      );
      if (!job || !candidate) {
        const e = new Error("Open job and accessible candidate required");
        e.statusCode = 400;
        throw e;
      }
      saved = (
        await Application.create(
          [
            {
              jobId: job._id,
              candidateId: candidate._id,
              departmentId: req.user.departmentId,
              createdBy: req.user.id,
              assignedTo: req.user.id,
              score: calculateApplicationMatch(job, candidate).score,
              notes: String(req.body.notes || "").slice(0, 10000),
            },
          ],
          { session },
        )
      )[0];
      await require("../services/recruitmentState.service").syncCandidate(
        candidate._id,
        session,
      );
    });
    res
      .status(201)
      .json(
        await Application.findById(saved._id)
          .populate("jobId")
          .populate("candidateId"),
      );
  } catch (e) {
    next(e);
  }
};

exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const allowed = [
      "Applied",
      "Screening",
      "Shortlisted",
      "Interview",
      "Offered",
      "Hired",
      "Rejected",
    ];
    if (!allowed.includes(req.body.status))
      return res.status(400).json({ message: "Invalid application status" });
    await mongoose.connection.transaction(async (session) => {
      const application = await Application.findOne(
        buildScopedQuery(req, { _id: req.params.id }),
      ).session(session);
      if (!application) {
        const e = new Error("Application not found");
        e.statusCode = 404;
        throw e;
      }
      if (application.status === req.body.status) return;
      const candidate = await Candidate.findOneAndUpdate(
        { _id: application.candidateId },
        { $inc: { __v: 1 } },
        { new: true, session },
      );
      const job = await Job.findById(application.jobId).session(session);
      if (!candidate || !job) {
        const e = new Error("Application has missing references");
        e.statusCode = 409;
        throw e;
      }
      application.status = req.body.status;
      application.statusRevision = (application.statusRevision || 0) + 1;
      await application.save({ session });
      await require("../services/mailOutbox.service").enqueueApplication(
        application,
        candidate,
        job,
        session,
      );
      await require("../services/recruitmentState.service").syncCandidate(
        candidate._id,
        session,
      );
    });
    res.json(
      await Application.findById(req.params.id)
        .populate("jobId")
        .populate("candidateId"),
    );
  } catch (e) {
    next(e);
  }
};
exports.deleteApplication = async (req, res, next) => {
  try {
    await mongoose.connection.transaction(async (session) => {
      const a = await Application.findOneAndDelete(
        buildScopedQuery(req, { _id: req.params.id }),
        { session },
      );
      if (!a) {
        const e = new Error("Application not found");
        e.statusCode = 404;
        throw e;
      }
      await Candidate.updateOne(
        { _id: a.candidateId },
        { $inc: { __v: 1 } },
        { session },
      );
      await require("../models/mailOutbox.model").deleteMany(
        { applicationId: a._id, status: { $ne: "sent" } },
        { session },
      );
      await require("../services/recruitmentState.service").syncCandidate(
        a.candidateId,
        session,
      );
    });
    res.json({ message: "Application deleted" });
  } catch (e) {
    next(e);
  }
};
exports.deliveryStatus = async (req, res, next) => {
  try {
    const a = await Application.findOne(
      buildScopedQuery(req, { _id: req.params.id }),
    );
    if (!a) return res.sendStatus(404);
    res.json(
      await require("../models/mailOutbox.model")
        .find({ applicationId: a._id })
        .select("status attempts lastError sentAt createdAt")
        .sort({ createdAt: -1 })
        .limit(20),
    );
  } catch (e) {
    next(e);
  }
};
exports.retryDelivery = async (req, res, next) => {
  try {
    const a = await Application.findOne(
      buildScopedQuery(req, { _id: req.params.id }),
    );
    if (!a) return res.sendStatus(404);
    const candidate = await Candidate.findById(a.candidateId);
    if (!candidate?.email) return res.status(400).json({message: "Candidate email is required before retrying."});
    await require("../models/mailOutbox.model").updateMany(
      { applicationId: a._id, status: { $in: ["blocked", "failed"] } },
      { $set: { status: "queued", to: candidate.email, attempts: 0, nextAttemptAt: new Date() } },
    );
    res.json({ message: "Delivery queued for retry" });
  } catch (e) {
    next(e);
  }
};
