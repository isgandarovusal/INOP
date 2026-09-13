const mongoose = require("mongoose");
const Candidate = require("../models/candidate.model");

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
    return 0;
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
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(candidates);
  } catch (error) {
    console.error("Get candidates error:", error);

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
    console.error("Get candidate error:", error);

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

    if (experience === null) {
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
    const candidate = new Candidate({
      name,
      role,
      status,

      email: normalizeString(req.body.email),
      phone: normalizeString(req.body.phone),
      education: normalizeString(req.body.education),

      skills: normalizeArray(req.body.skills),
      experience,

      languages: normalizeArray(req.body.languages),
      certificates: normalizeArray(
        req.body.certificates
      ),

      cvUrl,

      departmentId: req.user.departmentId || "",
      createdBy: req.user.id,
      assignedTo: req.user.id,
    });

    const saved = await candidate.save();

    return res.status(201).json(saved);
  } catch (error) {
    console.error("Create candidate error:", error);

    return res.status(400).json({
      message:
        error.message ||
        "Namizəd yaradılarkən xəta baş verdi.",
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
      update.phone = normalizeString(req.body.phone);
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

      if (experience === null) {
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

    /*
     * Authorization fields are intentionally ignored.
     *
     * Client cannot modify:
     * departmentId
     * createdBy
     * assignedTo
     */
    const updated = await Candidate.findOneAndUpdate(
      buildScopedQuery(req, {
        _id: id,
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
          "Namizəd tapılmadı və ya bu namizədi dəyişmək üçün icazəniz yoxdur.",
      });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update candidate error:", error);

    return res.status(400).json({
      message:
        error.message ||
        "Namizəd yenilənərkən xəta baş verdi.",
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

    return res.status(200).json({
      message: "Namizəd silindi.",
    });
  } catch (error) {
    console.error("Delete candidate error:", error);

    return res.status(500).json({
      message:
        "Namizəd silinərkən server xətası baş verdi.",
    });
  }
};
