const Audit = require("../models/audit.model");
const AuditAssignment = require("../models/auditAssignment.model");

async function getAuditIdFromRequest(req) {
  if (req.params?.auditId) {
    return req.params.auditId;
  }

  if (req.params?.id) {
    return req.params.id;
  }

  if (req.body?.auditId) {
    return req.body.auditId;
  }

  return null;
}

async function userHasAuditAccess(req, auditId) {
  if (!req.user?.id || !auditId) {
    return false;
  }

  const audit = await Audit.findOne({
    $or: [
      { _id: auditId },
      { id: auditId },
    ],
  })
    .select("_id auditorId")
    .lean();

  if (!audit) {
    return false;
  }

  if (String(audit.auditorId || "") === String(req.user.id)) {
    return true;
  }

  const assignment = await AuditAssignment.findOne({
    auditId: audit._id,
    auditor: req.user.id,
    status: {
      $in: ["assigned", "accepted", "started", "completed"],
    },
  })
    .select("_id")
    .lean();

  return Boolean(assignment);
}

exports.requireAssignedAuditAccess = async (req, res, next) => {
  try {
    const scope = req.permission?.scope;

    if (scope === "all") {
      return next();
    }

    if (scope !== "assigned") {
      return next();
    }

    const auditId = await getAuditIdFromRequest(req);

    if (!auditId) {
      return res.status(403).json({
        message:
          "Bu əməliyyat üçün Audit məlumatı müəyyən edilə bilmədi.",
      });
    }

    const allowed = await userHasAuditAccess(req, auditId);

    if (!allowed) {
      return res.status(403).json({
        message:
          "Bu Audit üzərində əməliyyat aparmaq üçün icazəniz yoxdur.",
      });
    }

    next();
  } catch (error) {
    console.error("Audit scope check error:", error);

    return res.status(500).json({
      message:
        "Audit məlumat səviyyəsi yoxlanılarkən server xətası baş verdi.",
    });
  }
};

exports.getAssignedAuditFilter = async (req) => {
  if (req.permission?.scope !== "assigned") {
    return {};
  }

  if (!req.user?.id) {
    return null;
  }

  const assignments = await AuditAssignment.find({
    auditor: req.user.id,
    status: {
      $in: ["assigned", "accepted", "started", "completed"],
    },
  })
    .select("auditId")
    .lean();

  const assignedIds = assignments.map((item) => item.auditId);

  return {
    $or: [
      {
        auditorId: req.user.id,
      },
      {
        _id: {
          $in: assignedIds,
        },
      },
    ],
  };
};
