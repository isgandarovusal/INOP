const mongoose = require("mongoose");
const Job = require("../models/job.model");

function getScopeFilter(req) {
  return req.dataScope || {};
}

function buildScopedQuery(req, extra = {}) {
  return {
    ...extra,
    ...getScopeFilter(req),
  };
}

function normalizeSkills(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildJobPayload(req) {
  return {
    title: String(req.body.title || "").trim(),
    department: String(
      req.body.department || req.user?.departmentId || ""
    ).trim(),
    location: String(req.body.location || "Remote").trim(),
    type: req.body.type || "Full-time",
    description: String(req.body.description || "").trim(),
    requiredSkills: normalizeSkills(req.body.requiredSkills),
    preferredSkills: normalizeSkills(req.body.preferredSkills),
    experienceYears: Number(req.body.experienceYears || 0),
    status: req.body.status || "Open",
  };
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find(
      buildScopedQuery(req)
    )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(jobs);
  } catch (error) {
    console.error("Get jobs error:", error);

    return res.status(500).json({
      message: "Vakansiyalar alınarkən server xətası baş verdi.",
    });
  }
};

exports.getJobById = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Vakansiya ID-si düzgün deyil.",
      });
    }

    const job = await Job.findOne(
      buildScopedQuery(req, {
        _id: req.params.id,
      })
    ).lean();

    if (!job) {
      return res.status(404).json({
        message:
          "Vakansiya tapılmadı və ya bu vakansiyaya giriş icazəniz yoxdur.",
      });
    }

    return res.status(200).json(job);
  } catch (error) {
    console.error("Get job error:", error);

    return res.status(500).json({
      message: "Vakansiya alınarkən server xətası baş verdi.",
    });
  }
};

exports.createJob = async (req, res) => {
  try {
    const payload = buildJobPayload(req);

    if (!payload.title) {
      return res.status(400).json({
        message: "Vakansiya adı tələb olunur.",
      });
    }

    if (!payload.description) {
      return res.status(400).json({
        message: "Vakansiya təsviri tələb olunur.",
      });
    }

    if (!payload.department) {
      return res.status(400).json({
        message: "Department tələb olunur.",
      });
    }

    const job = new Job({
      ...payload,
      departmentId: req.user?.departmentId || "",
      createdBy: req.user?.id || null,
      assignedTo: req.user?.id || null,
    });

    const saved = await job.save();

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create job error:", error);

    return res.status(400).json({
      message:
        error.message || "Vakansiya yaradılarkən xəta baş verdi.",
    });
  }
};

exports.updateJob = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Vakansiya ID-si düzgün deyil.",
      });
    }

    const allowedFields = [
      "title",
      "department",
      "location",
      "type",
      "description",
      "requiredSkills",
      "preferredSkills",
      "experienceYears",
      "status",
    ];

    const update = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    if (update.requiredSkills !== undefined) {
      update.requiredSkills = normalizeSkills(update.requiredSkills);
    }

    if (update.preferredSkills !== undefined) {
      update.preferredSkills = normalizeSkills(update.preferredSkills);
    }

    if (update.experienceYears !== undefined) {
      update.experienceYears = Number(update.experienceYears);
    }

    const updated = await Job.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: req.params.id,
      }),
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message:
          "Vakansiya tapılmadı və ya bu vakansiyanı dəyişmək üçün icazəniz yoxdur.",
      });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update job error:", error);

    return res.status(400).json({
      message:
        error.message || "Vakansiya yenilənərkən xəta baş verdi.",
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Vakansiya ID-si düzgün deyil.",
      });
    }

    const deleted = await Job.findOneAndDelete(
      buildScopedQuery(req, {
        _id: req.params.id,
      })
    );

    if (!deleted) {
      return res.status(404).json({
        message:
          "Vakansiya tapılmadı və ya bu vakansiyanı silmək üçün icazəniz yoxdur.",
      });
    }

    return res.status(200).json({
      message: "Vakansiya silindi.",
    });
  } catch (error) {
    console.error("Delete job error:", error);

    return res.status(500).json({
      message: "Vakansiya silinərkən server xətası baş verdi.",
    });
  }
};
