const Candidate = require("../models/candidate.model");

function getScopeFilter(req) {
  return req.dataScope || {};
}

function buildScopedQuery(req, extra = {}) {
  return {
    ...extra,
    ...getScopeFilter(req),
  };
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
    const candidate = await Candidate.findOne(
      buildScopedQuery(req, {
        _id: req.params.id,
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
    const cvUrl = req.file
      ? `/uploads/${req.file.filename}`
      : "";

    /*
     * Security rule:
     *
     * departmentId / createdBy / assignedTo
     * client request-dən qəbul edilmir.
     *
     * Bunlar backend tərəfindən müəyyən edilir.
     */
    const candidate = new Candidate({
      name: req.body.name,
      role: req.body.role,
      status: req.body.status || "applied",
      skills: Array.isArray(req.body.skills)
        ? req.body.skills
        : [],
      experience: Number(req.body.experience || 0),
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
        error.message || "Namizəd yaradılarkən xəta baş verdi.",
    });
  }
};

exports.updateCandidate = async (req, res) => {
  try {
    /*
     * Scope filter birbaşa MongoDB query-sinə əlavə olunur.
     *
     * Məsələn:
     *
     * assigned scope:
     * { _id: id, assignedTo: req.user.id }
     *
     * Beləliklə istifadəçi başqa candidate-in ID-sini
     * göndərərək onu dəyişə bilmir.
     */
    const update = {};

    if (req.body.name !== undefined) {
      update.name = req.body.name;
    }

    if (req.body.role !== undefined) {
      update.role = req.body.role;
    }

    if (req.body.status !== undefined) {
      update.status = req.body.status;
    }

    if (req.body.skills !== undefined) {
      update.skills = Array.isArray(req.body.skills)
        ? req.body.skills
        : [];
    }

    if (req.body.experience !== undefined) {
      update.experience = Number(req.body.experience);
    }

    /*
     * Authorization fields client tərəfindən dəyişdirilə bilməz:
     *
     * departmentId
     * createdBy
     * assignedTo
     */
    delete update.departmentId;
    delete update.createdBy;
    delete update.assignedTo;

    const updated = await Candidate.findOneAndUpdate(
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
          "Namizəd tapılmadı və ya bu namizədi dəyişmək üçün icazəniz yoxdur.",
      });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Update candidate error:", error);

    return res.status(400).json({
      message:
        error.message || "Namizəd yenilənərkən xəta baş verdi.",
    });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const deleted = await Candidate.findOneAndDelete(
      buildScopedQuery(req, {
        _id: req.params.id,
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
      message: "Namizəd silinərkən server xətası baş verdi.",
    });
  }
};
