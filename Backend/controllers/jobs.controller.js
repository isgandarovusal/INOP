const { recordActivity } = require("../services/activityLog.service");
const mongoose = require("mongoose");
const Job = require("../models/job.model");
const { listRecords, searchFilter } = require("../utils/listQuery");
const { sendError } = require("../utils/sendError");

function getScopeFilter(req) {
  return req.dataScope || {};
}

function buildScopedQuery(req, extra = {}) {
  return {
    deletedAt: null,
    ...extra,
    ...getScopeFilter(req),
  };
}

const jobTypeValues = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
];

const jobStatusValues = [
  "Open",
  "Closed",
  "Draft",
];

function normalizeString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeSkills(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return null;
}

function parseExperienceYears(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const experience = Number(value);

  if (!Number.isFinite(experience) || experience < 0) {
    return null;
  }

  return experience;
}

function validateJobType(value) {
  return jobTypeValues.includes(value);
}

function validateJobStatus(value) {
  return jobStatusValues.includes(value);
}

function buildJobPayload(req) {
  const requiredSkills = normalizeSkills(
    req.body.requiredSkills
  );

  const preferredSkills = normalizeSkills(
    req.body.preferredSkills
  );

  const experienceYears = parseExperienceYears(
    req.body.experienceYears
  );

  return {
    title: normalizeString(req.body.title),
    department: normalizeString(
      req.body.department || req.user?.departmentId || ""
    ),
    location:
      normalizeString(req.body.location) || "Remote",
    type:
      req.body.type === undefined
        ? "Full-time"
        : normalizeString(req.body.type),
    description: normalizeString(req.body.description),
    requiredSkills,
    preferredSkills,
    experienceYears,
    status:
      req.body.status === undefined
        ? "Open"
        : normalizeString(req.body.status),
  };
}

function validateJobPayload(payload) {
  if (!payload.title) {
    return "Vakansiya adı tələb olunur.";
  }

  if (!payload.description) {
    return "Vakansiya təsviri tələb olunur.";
  }

  if (!payload.department) {
    return "Department tələb olunur.";
  }

  if (!jobTypeValues.includes(payload.type)) {
    return "Vakansiya tipi düzgün deyil.";
  }

  if (!jobStatusValues.includes(payload.status)) {
    return "Vakansiya statusu düzgün deyil.";
  }

  if (payload.requiredSkills === null) {
    return "Required skills düzgün formatda olmalıdır.";
  }

  if (payload.preferredSkills === null) {
    return "Preferred skills düzgün formatda olmalıdır.";
  }

  if (payload.experienceYears === null) {
    return "Təcrübə ili 0 və ya daha böyük rəqəm olmalıdır.";
  }

  return null;
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.getJobs = async (req, res) => {
  try {
    const jobs = await listRecords(Job,
      buildScopedQuery(req, searchFilter(req.query, ["title", "department", "location"])), req, res);

    return res.status(200).json(jobs);
  } catch (error) {
    return sendError(res, error, "Vakansiyalar alınarkən server xətası baş verdi.");
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
    console.error("Get job error:", error?.name || "Error");

    return res.status(500).json({
      message: "Vakansiya alınarkən server xətası baş verdi.",
    });
  }
};

exports.createJob = async (req, res) => {
  try {
    const payload = buildJobPayload(req);

    const validationError = validateJobPayload(payload);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const job = new Job({
      ...payload,
      departmentId: req.user?.departmentId || "",
      createdBy: req.user?.id || null,
      assignedTo: req.user?.id || null,
    });

    const saved = await job.save();

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "job",
        entityId: saved._id,
        description: `Vakansiya yaradıldı: ${saved.title}`,
      });
    } catch (activityError) {
      console.error("Job create activity log error:", activityError?.name || "Error");
    }

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create job error:", error?.name || "Error");

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Vakansiya məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Vakansiya yaradılarkən server xətası baş verdi.",
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

    if (update.title !== undefined) {
      update.title = normalizeString(update.title);

      if (!update.title) {
        return res.status(400).json({
          message: "Vakansiya adı boş ola bilməz.",
        });
      }
    }

    if (update.department !== undefined) {
      update.department = normalizeString(update.department);

      if (!update.department) {
        return res.status(400).json({
          message: "Department boş ola bilməz.",
        });
      }
    }

    if (update.location !== undefined) {
      update.location = normalizeString(update.location);

      if (!update.location) {
        return res.status(400).json({
          message: "Lokasiya boş ola bilməz.",
        });
      }
    }

    if (update.description !== undefined) {
      update.description = normalizeString(update.description);

      if (!update.description) {
        return res.status(400).json({
          message: "Vakansiya təsviri boş ola bilməz.",
        });
      }
    }

    if (update.type !== undefined) {
      update.type = normalizeString(update.type);

      if (!validateJobType(update.type)) {
        return res.status(400).json({
          message: "Vakansiya tipi düzgün deyil.",
        });
      }
    }

    if (update.status !== undefined) {
      update.status = normalizeString(update.status);

      if (!validateJobStatus(update.status)) {
        return res.status(400).json({
          message: "Vakansiya statusu düzgün deyil.",
        });
      }
    }

    if (update.requiredSkills !== undefined) {
      update.requiredSkills = normalizeSkills(
        update.requiredSkills
      );

      if (update.requiredSkills === null) {
        return res.status(400).json({
          message:
            "Required skills düzgün formatda olmalıdır.",
        });
      }
    }

    if (update.preferredSkills !== undefined) {
      update.preferredSkills = normalizeSkills(
        update.preferredSkills
      );

      if (update.preferredSkills === null) {
        return res.status(400).json({
          message:
            "Preferred skills düzgün formatda olmalıdır.",
        });
      }
    }

    if (update.experienceYears !== undefined) {
      update.experienceYears = parseExperienceYears(
        update.experienceYears
      );

      if (update.experienceYears === null) {
        return res.status(400).json({
          message:
            "Təcrübə ili 0 və ya daha böyük rəqəm olmalıdır.",
        });
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        message: "Yenilənəcək məlumat göndərilməyib.",
      });
    }

    const updated = await Job.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: req.params.id,
      }),
      update,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        message:
          "Vakansiya tapılmadı və ya bu vakansiyanı dəyişmək üçün icazəniz yoxdur.",
      });
    }

    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "job",
        entityId: updated._id,
        description: `Vakansiya yeniləndi: ${updated.title}`,
      });
    } catch (activityError) {
      console.error("Job update activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update job error:", error?.name || "Error");

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Vakansiya məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      message: "Vakansiya yenilənərkən server xətası baş verdi.",
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

    const deleted = await Job.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: req.params.id,
      }),
      { $set: { deletedAt: new Date(), status: "Closed" } },
      { returnDocument: "after", runValidators: true }
    );

    if (!deleted) {
      return res.status(404).json({
        message:
          "Vakansiya tapılmadı və ya bu vakansiyanı silmək üçün icazəniz yoxdur.",
      });
    }

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "job",
        entityId: deleted._id,
        description: `Vakansiya silindi: ${deleted.title}`,
      });
    } catch (activityError) {
      console.error("Job delete activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json({
      message: "Vakansiya silindi.",
    });
  } catch (error) {
    console.error("Delete job error:", error?.name || "Error");

    return res.status(500).json({
      message: "Vakansiya silinərkən server xətası baş verdi.",
    });
  }
};
