const mongoose = require("mongoose");
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

async function findAuditByIdentifier(auditId) {
  if (!auditId) {
    return null;
  }

  const conditions = [{ id: String(auditId) }];

  if (mongoose.Types.ObjectId.isValid(auditId)) {
    conditions.unshift({
      _id: new mongoose.Types.ObjectId(auditId),
    });
  }

  return Audit.findOne({
    $or: conditions,
  })
    .select("_id id auditorId")
    .lean();
}

async function userHasAuditAccess(req, auditId) {
  if (!req.user?.id || !auditId) {
    return false;
  }

  const audit = await findAuditByIdentifier(auditId);

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

exports.getAuditIdFromRequest = getAuditIdFromRequest;

exports.findAuditByIdentifier = findAuditByIdentifier;

exports.userHasAuditAccess = userHasAuditAccess;

exports.requireAssignedAuditAccess = async (req, res, next) => {
  try {
    const scope = req.permission?.scope;

    if (scope === "all") {
      return next();
    }

    if (scope !== "assigned" && scope !== "own") {
      return res.status(403).json({
        success: false,
        message: "Bu Audit məlumat səviyyəsi dəstəklənmir.",
      });
    }

    const auditId = await getAuditIdFromRequest(req);

    if (!auditId) {
      return res.status(403).json({
        success: false,
        message:
          "Bu əməliyyat üçün Audit məlumatı müəyyən edilə bilmədi.",
      });
    }

    let allowed = false;

    if (scope === "assigned") {
      allowed = await userHasAuditAccess(req, auditId);
    } else {
      const audit = await findAuditByIdentifier(auditId);
      allowed = Boolean(
        audit &&
        String(audit.auditorId || "") === String(req.user.id)
      );
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "Bu Audit üzərində əməliyyat aparmaq üçün icazəniz yoxdur.",
      });
    }

    return next();
  } catch (error) {
    console.error("Audit scope check error:", error);

    return res.status(500).json({
      success: false,
      message:
        "Audit məlumat səviyyəsi yoxlanılarkən server xətası baş verdi.",
    });
  }
};

exports.getAssignedAuditFilter = async (req) => {
  const scope = req.permission?.scope;

  if (scope === "all") {
    return {};
  }

  if (!req.user?.id) {
    return null;
  }

  if (scope === "own") {
    return {
      auditorId: req.user.id,
    };
  }

  if (scope !== "assigned") {
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


exports.requireAssignedResourceAuditAccess = (Model, options = {}) => {
  const idParam = options.idParam || "id";
  const auditField = options.auditField || "auditId";

  return async (req, res, next) => {
    try {
      const scope = req.permission?.scope;

      if (scope === "all") {
        return next();
      }

      if (scope !== "assigned" && scope !== "own") {
        return res.status(403).json({
          success: false,
          message: "Bu Audit məlumat səviyyəsi dəstəklənmir.",
        });
      }

      const resourceId = req.params?.[idParam];

      if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          message: "Resurs ID-si düzgün deyil.",
        });
      }

      const resource = await Model.findById(resourceId)
        .select(auditField)
        .lean();

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resurs tapılmadı.",
        });
      }

      const auditId = resource[auditField];
      let allowed = false;

      if (scope === "assigned") {
        allowed = await userHasAuditAccess(req, auditId);
      } else {
        const audit = await findAuditByIdentifier(auditId);
        allowed = Boolean(
          audit &&
          String(audit.auditorId || "") === String(req.user.id)
        );
      }

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message:
            "Bu Audit resursu üzərində əməliyyat aparmaq üçün icazəniz yoxdur.",
        });
      }

      req.auditId = String(auditId);
      return next();
    } catch (error) {
      console.error("Audit resource scope check error:", error);

      return res.status(500).json({
        success: false,
        message:
          "Audit resursunun giriş səviyyəsi yoxlanılarkən server xətası baş verdi.",
      });
    }
  };
};
