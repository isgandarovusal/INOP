const fs = require("fs/promises");
const mongoose = require("mongoose");

const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const Application = require("../models/application.model");

const {
  extractCvTextFromFile,
} = require("../services/cvParser.service");

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
  if (value === undefined || value === null || value === "") {
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

function numberValue(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return Number(fallback) || 0;
  }

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
  if (!file?.path) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("CV cleanup error:", error);
    }
  }
}

exports.createCandidateFromCv = async (req, res) => {
  let savedCandidate = null;
  let savedApplication = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CV faylı tələb olunur.",
      });
    }

    const cvText = await extractCvTextFromFile(
      req.file.path,
      req.file.originalname
    );

    if (!cvText) {
      await cleanupFile(req.file);

      return res.status(422).json({
        message:
          "CV faylından oxuna bilən mətn tapılmadı.",
      });
    }

    const parsed = parseStructuredCv(cvText);

    const jobId = stringValue(req.body.jobId);

    let job = null;

    if (jobId) {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        await cleanupFile(req.file);

        return res.status(400).json({
          message: "Job ID düzgün deyil.",
        });
      }

      job = await Job.findOne({
        _id: jobId,
        ...(req.dataScope || {}),
      }).lean();

      if (!job) {
        await cleanupFile(req.file);

        return res.status(404).json({
          message:
            "Vakansiya tapılmadı və ya giriş icazəniz yoxdur.",
        });
      }
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

    if (experience === null) {
      await cleanupFile(req.file);

      return res.status(400).json({
        message:
          "Təcrübə ili düzgün rəqəm olmalıdır.",
      });
    }

    savedCandidate = await Candidate.create({
      name,
      role,
      status,

      email:
        stringValue(req.body.email) ||
        parsed.email,

      phone:
        stringValue(req.body.phone) ||
        parsed.phone,

      education:
        stringValue(req.body.education) ||
        parsed.education,

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

      departmentId:
        req.user?.departmentId || "",

      createdBy:
        req.user?.id || null,

      assignedTo:
        req.user?.id || null,
    });

    let match = null;

    if (job) {
      match = calculateApplicationMatch(
        job,
        savedCandidate
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

          score: match.score,

          notes:
            stringValue(req.body.notes),
        });
    }

    return res.status(201).json({
      success: true,

      candidate: savedCandidate,

      parsed: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
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
    console.error(
      "Create candidate from CV error:",
      error
    );

    if (savedApplication?._id) {
      try {
        await Application.deleteOne({
          _id: savedApplication._id,
        });
      } catch (cleanupError) {
        console.error(
          "Application rollback error:",
          cleanupError
        );
      }
    }

    if (savedCandidate?._id) {
      try {
        await Candidate.deleteOne({
          _id: savedCandidate._id,
        });
      } catch (cleanupError) {
        console.error(
          "Candidate rollback error:",
          cleanupError
        );
      }
    }

    await cleanupFile(req.file);

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
