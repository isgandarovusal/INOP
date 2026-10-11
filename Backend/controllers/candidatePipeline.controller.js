const { logFailure } = require("../services/safeErrorLog.service");
const fs = require("fs/promises");
const { creationEvent } = require("../services/applicationLifecycle.service");
const mongoose = require("mongoose");
const { recordActivity } = require("../services/activityLog.service");

const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const Application = require("../models/application.model");
const { resourceFilter } = require('../services/hrResourceScope.service');
const recovery = require('../services/hrCreateRecovery.service');

const { reviewForFile, contactPhone, historyInput } = require('../services/cvReview.service');

const {
  parseStructuredCv,
} = require("../services/cvStructuredParser.service");

const {
  calculateApplicationMatch,
} = require("../services/applicationMatch.service");

function stringValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function listValue(value, fallback = []) {
  if (value === undefined || value === null) {
    return Array.isArray(fallback) ? fallback : [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  const text = String(value).trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch (_) {
    // Fall back to delimiter parsing.
  }

  return text
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberValue(value, fallback = null) {
  if (value === undefined) {
    return fallback == null ? null : Number(fallback);
  }
  if (value === null || value === "") return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeCandidateStatus(value) {
  const normalized = stringValue(value).toLowerCase();

  if (!normalized) {
    return "applied";
  }

  const allowed =
    Candidate.schema.path("status").enumValues;

  return allowed.includes(normalized)
    ? normalized
    : null;
}

async function cleanupFile(file) {
  if (!file?.path || file.preserveOnError) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      logFailure(error);
    }
  }
}

exports.createCandidateFromCv = async (req, res) => {
  let savedCandidate = null;
  let savedApplication = null;
  let attempt;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CV faylı tələb olunur.",
      });
    }

    if (req.body.notes !== undefined && (typeof req.body.notes !== 'string' || req.body.notes.length > 5000)) {
      await cleanupFile(req.file);
      return res.status(400).json({ message: 'Notes must be text up to 5000 characters.' });
    }
    const extracted = await reviewForFile(req.file);
    const parsed = extracted.parsed || parseStructuredCv('');

    const jobId = stringValue(req.body.jobId);

    let job = null;

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        await cleanupFile(req.file);

        return res.status(400).json({
          message: "Job ID düzgün deyil.",
        });
      }

      job = await Job.findOne({ $and: [
        { _id: jobId }, resourceFilter(req, 'recruitment'),
      ] }).lean();

      if (!job) {
        await cleanupFile(req.file);

        return res.status(404).json({
          message:
            "Vakansiya tapılmadı və ya giriş icazəniz yoxdur.",
        });
      }
    }

    if (job && job.status !== 'Open') {
      await cleanupFile(req.file);
      return res.status(409).json({ message: 'This vacancy is not accepting applications.', code: 'JOB_NOT_OPEN' });
    }
    const name =
      stringValue(req.body.name) ||
      parsed.name;

    const role =
      stringValue(req.body.role) ||
      parsed.role ||
      stringValue(job?.title);

    if (!name) {
      await cleanupFile(req.file);

      return res.status(422).json({
        message:
          "CV-dən namizədin adı müəyyən edilə bilmədi. name sahəsini göndərin.",
      });
    }

    if (!role) {
      await cleanupFile(req.file);

      return res.status(422).json({
        message:
          "CV-dən namizədin vəzifəsi müəyyən edilə bilmədi. role və ya jobId göndərin.",
      });
    }

    const status = normalizeCandidateStatus(
      req.body.status
    );

    if (!status) {
      await cleanupFile(req.file);

      return res.status(400).json({
        message: "Namizəd statusu düzgün deyil.",
      });
    }

    const experience = numberValue(
      req.body.experience,
      parsed.experience
    );

    if (experience === null && req.body.experience !== undefined && req.body.experience !== null && req.body.experience !== "") {
      await cleanupFile(req.file);

      return res.status(400).json({
        message:
          "Təcrübə ili düzgün rəqəm olmalıdır.",
      });
    }

    const histories = {};
    for (const field of ['employmentHistory', 'educationHistory', 'certificationHistory']) {
      if (req.body[field] !== undefined) {
        histories[field] = historyInput(req.body[field]);
        if (histories[field] === null) {
          await cleanupFile(req.file);
          return res.status(400).json({ message: 'CV history düzgün deyil.' });
        }
      }
    }
    const authority = await recovery.creation(req, true);
    // Job scope/status are checked again after parsing, using current grants.
    if(jobId){job=await Job.findOne({$and:[{_id:jobId},resourceFilter(req,'recruitment')]}).lean();
      if(!job)throw Object.assign(new Error('Job is unavailable.'),{status:404,code:'JOB_UNAVAILABLE'});
      if(job.status!=='Open')throw Object.assign(new Error('Job is not open.'),{status:409,code:'JOB_NOT_OPEN'});
    }
    const candidateId = new mongoose.Types.ObjectId();
    const candidatePayload = {
      _id: candidateId,
      name,
      role,
      status,

      email:
        req.body.email !== undefined ? stringValue(req.body.email) : parsed.email,

      ...contactPhone(req.body.phone !== undefined ? req.body.phone : parsed.phoneRaw),

      education:
        req.body.education !== undefined ? stringValue(req.body.education) : parsed.education,

      skills: listValue(
        req.body.skills,
        parsed.skills
      ),

      experience,

      languages: listValue(
        req.body.languages,
        parsed.languages
      ),

      certificates: listValue(
        req.body.certificates,
        parsed.certificates
      ),

      cvUrl: `/uploads/${req.file.filename}`,
      cvOriginal: extracted.original,
      cvReview: extracted.review,
      employmentHistory: parsed.employmentHistory,
      educationHistory: parsed.educationHistory,
      certificationHistory: parsed.certificationHistory,
      ...histories,

      departmentId:
        req.user?.departmentId || "",

      createdBy:
        req.user?.id || null,

      assignedTo:
        req.user?.id || null,
    };
    await new Candidate(candidatePayload).validate();
    attempt={candidateId,candidateSaved:false};
    recovery.preserve(req.file);
    savedCandidate = await Candidate.create(candidatePayload);
    attempt.candidateSaved=true;

    let match = null;

    if (job) {
      if(await recovery.creation(req,true)!==authority)throw Object.assign(new Error('Authorization changed.'),{status:403,code:'HR_PERMISSION_CHANGED'});
      job=await Job.findOne({$and:[{_id:jobId},resourceFilter(req,'recruitment')]}).lean();
      if(!job)throw Object.assign(new Error('Job is unavailable.'),{status:404,code:'JOB_UNAVAILABLE'});
      if(job.status!=='Open')throw Object.assign(new Error('Job is not open.'),{status:409,code:'JOB_NOT_OPEN'});
      match = calculateApplicationMatch(
        job,
        savedCandidate,
        { application: { jobId: job._id, candidateId: savedCandidate._id } }
      );

      savedApplication =
        await Application.create({
          jobId: job._id,
          candidateId: savedCandidate._id,

          departmentId:
            req.user?.departmentId || "",

          createdBy:
            req.user?.id || null,

          assignedTo:
            req.user?.id || null,

          score: match.score, matching: match, scoreStatus: match.scoreStatus, events: [creationEvent(req)], source: { key: 'cv_upload', receivedAt: new Date() },

          notes:
            stringValue(req.body.notes),
        });
    }

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "candidate",
        entityId: savedCandidate._id,
        description: `Namizəd CV-dən yaradıldı: ${savedCandidate.name} (${savedCandidate.role})`,
      });
    } catch (activityError) {
      logFailure(activityError);
    }

    if (savedApplication?._id) {
      try {
        await recordActivity({
          req,
          action: "create",
          entityType: "application",
          entityId: savedApplication._id,
          description: `Müraciət CV pipeline-dan yaradıldı: ${savedCandidate.name} → ${job.title}`,
        });
      } catch (activityError) {
        logFailure(activityError);
      }
    }

    return res.status(201).json({
      success: true,

      candidate: savedCandidate,

      parsed: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        phoneRaw: parsed.phoneRaw,
        extraction: extracted.review,
        role: parsed.role,
        education: parsed.education,
        skills: parsed.skills,
        experience: parsed.experience,
        languages: parsed.languages,
        certificates: parsed.certificates,
      },

      application: savedApplication,

      match,
    });
  } catch (error) {
    logFailure(error);

    // A failed acknowledgement cannot prove that the write did not commit.
    // Preserve valid/possibly linked parents and their original, rather than
    // deleting records which another operation may already reference.
    if(attempt)return res.status(error.status||500).json({message:'CV creation requires review before retrying.',...await recovery.failure(req,attempt)});

    await cleanupFile(req.file);

    if(error.status)return res.status(error.status).json({code:error.code,message:'Current resource or authorization is unavailable.'});

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message:
          "CV-dən yaradılan namizəd məlumatları düzgün deyil.",
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        message:
          "Bu namizəd artıq həmin vakansiyaya müraciət edib.",
      });
    }

    return res.status(500).json({
      message:
        "CV pipeline emal edilərkən server xətası baş verdi.",
    });
  }
};
