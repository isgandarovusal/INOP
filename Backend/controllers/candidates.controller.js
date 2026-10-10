const { logFailure } = require("../services/safeErrorLog.service");
const mongoose = require("mongoose");
const { invalidateScores } = require("../services/applicationScoreState.service");
const { recordActivity } = require("../services/activityLog.service");
const Candidate = require("../models/candidate.model");
const { reviewForFile, contactPhone, manualReview, historyInput } = require('../services/cvReview.service');

const candidateStatusValues =
  Candidate.schema.path("status").enumValues;

function getScopeFilter(req) {
  return req.dataScope || {};
}

function buildScopedQuery(req, extra = {}) {
  return {
    ...extra,
    ...getScopeFilter(req),
  };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeArray(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const values = Array.isArray(value)
    ? value
    : [value];

  return values
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function normalizeStatus(value) {
  const status = normalizeString(value).toLowerCase();

  if (!status) {
    return "applied";
  }

  return candidateStatusValues.includes(status)
    ? status
    : null;
}

function parseExperience(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const experience = Number(value);

  if (!Number.isFinite(experience) || experience < 0) {
    return null;
  }

  return experience;
}

exports.getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find(
      buildScopedQuery(req)
    )
      .select('-cvReview.fields -employmentHistory -educationHistory -certificationHistory')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(candidates);
  } catch (error) {
    logFailure(error);

    return res.status(500).json({
      message: "Namizədlər alınarkən server xətası baş verdi.",
    });
  }
};

exports.getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Namizəd ID-si düzgün deyil.",
      });
    }

    const candidate = await Candidate.findOne(
      buildScopedQuery(req, {
        _id: id,
      })
    ).lean();

    if (!candidate) {
      return res.status(404).json({
        message: "Namizəd tapılmadı.",
      });
    }

    return res.status(200).json(candidate);
  } catch (error) {
    logFailure(error);

    return res.status(500).json({
      message: "Namizəd alınarkən server xətası baş verdi.",
    });
  }
};

exports.createCandidate = async (req, res) => {
  try {
    const name = normalizeString(req.body.name);
    const role = normalizeString(req.body.role);

    if (!name) {
      return res.status(400).json({
        message: "Namizədin adı tələb olunur.",
      });
    }

    if (!role) {
      return res.status(400).json({
        message: "Namizədin vəzifəsi tələb olunur.",
      });
    }

    const status = normalizeStatus(req.body.status);

    if (!status) {
      return res.status(400).json({
        message: "Namizəd statusu düzgün deyil.",
      });
    }

    const experience = parseExperience(
      req.body.experience
    );

    if (experience === null && req.body.experience !== undefined && req.body.experience !== null && req.body.experience !== "") {
      return res.status(400).json({
        message: "Təcrübə ili düzgün rəqəm olmalıdır.",
      });
    }

    const cvUrl = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    /*
     * Security rule:
     *
     * departmentId / createdBy / assignedTo
     * client request-dən qəbul edilmir.
     */
    const extracted = await reviewForFile(req.file);
    const histories = {};
    for (const field of ['employmentHistory', 'educationHistory', 'certificationHistory']) {
      if (req.body[field] !== undefined) {
        histories[field] = historyInput(req.body[field]);
        if (histories[field] === null) return res.status(400).json({ message: 'CV history düzgün deyil.' });
      }
    }
    const candidate = new Candidate({
      name,
      role,
      status,

      email: req.body.email !== undefined ? normalizeString(req.body.email) : extracted?.parsed?.email || '',
      ...contactPhone(req.body.phone !== undefined ? req.body.phone : extracted?.parsed?.phoneRaw),
      education: req.body.education !== undefined ? normalizeString(req.body.education) : extracted?.parsed?.education || '',

      reviewedFields: ["role", "skills", "experience", "education", "certificates", "employmentHistory"].filter(key => req.body[key] !== undefined),
      skills: req.body.skills !== undefined ? normalizeArray(req.body.skills) : extracted?.parsed?.skills || [],
      experience: req.body.experience !== undefined ? experience : extracted?.parsed?.experience ?? null,

      languages: req.body.languages !== undefined ? normalizeArray(req.body.languages) : extracted?.parsed?.languages || [],
      certificates: req.body.certificates !== undefined ? normalizeArray(req.body.certificates) : extracted?.parsed?.certificates || [],

      cvUrl,
      cvOriginal: extracted?.original,
      cvReview: extracted?.review,
      employmentHistory: extracted?.parsed?.employmentHistory || [],
      educationHistory: extracted?.parsed?.educationHistory || [],
      certificationHistory: extracted?.parsed?.certificationHistory || [],
      ...histories,

      departmentId: req.user.departmentId || "",
      createdBy: req.user.id,
      assignedTo: req.user.id,
    });

    const saved = await candidate.save();

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "candidate",
        entityId: saved._id,
        description: `Namizəd yaradıldı: ${saved.name} (${saved.role})`,
      });
    } catch (activityError) {
      logFailure(activityError);
    }

    return res.status(201).json(saved);
  } catch (error) {
    logFailure(error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Namizəd məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Namizəd yaradılarkən server xətası baş verdi.",
    });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Namizəd ID-si düzgün deyil.",
      });
    }

    const update = {};
    if (req.file) update.cvUrl = `/uploads/${req.file.filename}`;
    const current = await Candidate.findOne(buildScopedQuery(req, { _id: id }));
    if (!current) return res.status(404).json({ message: "Namizəd tapılmadı və ya giriş icazəniz yoxdur." });
    const expected = req.body.expectedRevision;
    if (expected !== undefined && (!Number.isInteger(Number(expected)) || Number(expected) < 0)) return res.status(400).json({ message: 'Revision düzgün deyil.' });
    if (expected !== undefined && Number(expected) !== (current.__v ?? 0)) return res.status(409).json({ message: 'Namizəd başqa əməliyyatda dəyişib. Son məlumatı yenidən yükləyin.', code: 'REVISION_CONFLICT' });

    if (req.body.name !== undefined) {
      const name = normalizeString(req.body.name);

      if (!name) {
        return res.status(400).json({
          message: "Namizədin adı boş ola bilməz.",
        });
      }

      update.name = name;
    }

    if (req.body.role !== undefined) {
      const role = normalizeString(req.body.role);

      if (!role) {
        return res.status(400).json({
          message: "Namizədin vəzifəsi boş ola bilməz.",
        });
      }

      update.role = role;
    }

    if (req.body.status !== undefined) {
      const status = normalizeStatus(req.body.status);

      if (!status) {
        return res.status(400).json({
          message: "Namizəd statusu düzgün deyil.",
        });
      }

      update.status = status;
    }

    if (req.body.email !== undefined) {
      update.email = normalizeString(req.body.email);
    }

    if (req.body.phone !== undefined) {
      Object.assign(update, contactPhone(req.body.phone));
    }

    if (req.body.education !== undefined) {
      update.education =
        normalizeString(req.body.education);
    }

    if (req.body.skills !== undefined) {
      update.skills = normalizeArray(
        req.body.skills
      );
    }

    if (req.body.experience !== undefined) {
      const experience = parseExperience(
        req.body.experience
      );

      if (experience === null && req.body.experience !== null && req.body.experience !== "") {
        return res.status(400).json({
          message:
            "Təcrübə ili düzgün rəqəm olmalıdır.",
        });
      }

      update.experience = experience;
    }

    if (req.body.languages !== undefined) {
      update.languages = normalizeArray(
        req.body.languages
      );
    }

    if (req.body.certificates !== undefined) {
      update.certificates = normalizeArray(
        req.body.certificates
      );
    }
    for (const field of ['employmentHistory', 'educationHistory', 'certificationHistory']) {
      if (req.body[field] !== undefined) {
        update[field] = historyInput(req.body[field]);
        if (update[field] === null) return res.status(400).json({ message: 'CV history düzgün deyil.' });
      }
    }

    const extracted = await reviewForFile(req.file);
    if (extracted) {
      update.cvOriginal = extracted.original; update.cvReview = extracted.review;
      update.employmentHistory ??= extracted.parsed?.employmentHistory || [];
      update.educationHistory ??= extracted.parsed?.educationHistory || [];
      update.certificationHistory ??= extracted.parsed?.certificationHistory || [];
    } else {
      const review = manualReview(req, current, update);
      if (review === null) return res.status(400).json({ message: 'CV review status düzgün deyil.' });
      if (review !== undefined) update.cvReview = review;
    }

    /*
     * Authorization fields are intentionally ignored.
     *
     * Client cannot modify:
     * departmentId
     * createdBy
     * assignedTo
     */
    update.reviewedFields = [...new Set([...(req.file ? [] : current.reviewedFields || []), ...["role", "skills", "experience", "education", "certificates", "employmentHistory"].filter(key => req.body[key] !== undefined)])];
    const updated = await Candidate.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: id,
        __v: current.__v === undefined ? { $exists: false } : current.__v,
      }),
      { $set: update, $inc: { __v: 1 } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      if (await Candidate.exists(buildScopedQuery(req, { _id: id }))) return res.status(409).json({ message: 'Namizəd başqa əməliyyatda dəyişib. Son məlumatı yenidən yükləyin.', code: 'REVISION_CONFLICT' });
      return res.status(404).json({
        message:
          "Namizəd tapılmadı və ya bu namizədi dəyişmək üçün icazəniz yoxdur.",
      });
    }

    await invalidateScores("candidateId", updated._id);
    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "candidate",
        entityId: updated._id,
        description: `Namizəd yeniləndi: ${updated.name} (${updated.role})`,
      });
    } catch (activityError) {
      logFailure(activityError);
    }

    return res.status(200).json(updated);
  } catch (error) {
    logFailure(error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Namizəd məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Namizəd yenilənərkən server xətası baş verdi.",
    });
  }
};


exports.updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Namizəd ID-si düzgün deyil.",
      });
    }

    const status = normalizeStatus(req.body.status);

    if (!status) {
      return res.status(400).json({
        message: "Namizəd statusu düzgün deyil.",
      });
    }

    const existing = await Candidate.findOne(
      buildScopedQuery(req, {
        _id: id,
      })
    );

    if (!existing) {
      return res.status(404).json({
        message:
          "Namizəd tapılmadı və ya bu namizədi dəyişmək üçün icazəniz yoxdur.",
      });
    }

    const updated = await Candidate.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: id,
      }),
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message:
          "Namizəd tapılmadı və ya bu namizədi dəyişmək üçün icazəniz yoxdur.",
      });
    }

    if (existing.status !== updated.status) {
      try {
        await recordActivity({
          req,
          action: "status_change",
          entityType: "candidate",
          entityId: updated._id,
          description: `Namizəd statusu dəyişdirildi: ${updated.name} (${existing.status} → ${updated.status})`,
        });
      } catch (activityError) {
        logFailure(activityError);
      }
    }

    return res.status(200).json(updated);
  } catch (error) {
    logFailure(error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Namizəd statusu düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Namizəd statusu yenilənərkən server xətası baş verdi.",
    });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Namizəd ID-si düzgün deyil.",
      });
    }

    const deleted = await Candidate.findOneAndDelete(
      buildScopedQuery(req, {
        _id: id,
      })
    );

    if (!deleted) {
      return res.status(404).json({
        message:
          "Namizəd tapılmadı və ya bu namizədi silmək üçün icazəniz yoxdur.",
      });
    }

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "candidate",
        entityId: deleted._id,
        description: `Namizəd silindi: ${deleted.name} (${deleted.role})`,
      });
    } catch (activityError) {
      logFailure(activityError);
    }

    return res.status(200).json({
      message: "Namizəd silindi.",
    });
  } catch (error) {
    logFailure(error);

    return res.status(500).json({
      message:
        "Namizəd silinərkən server xətası baş verdi.",
    });
  }
};
