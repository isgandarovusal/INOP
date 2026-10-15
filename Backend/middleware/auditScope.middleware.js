const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const AuditAssignment = require("../models/auditAssignment.model");
const AuditDepartmentSnapshot = require("../models/auditDepartmentSnapshot.model");

async function getAuditIdFromRequest(req) {
  // Set only by a server-side child-record resolver, never by request JSON.
  if (req.auditScopeId) {
    return req.auditScopeId;
  }

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

  if (mongoose.Types.ObjectId.isValid(auditId)) {
    const audit = await Audit.findById(auditId).select("_id id auditorId").lean();
    if (audit) return audit;
  }

  return Audit.findOne({ id: String(auditId) })
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

    if (scope !== "assigned") {
      return next();
    }

    const auditId = await getAuditIdFromRequest(req);

    if (!auditId) {
      return res.status(403).json({
        success: false,
        message:
          "Bu əməliyyat üçün Audit məlumatı müəyyən edilə bilmədi.",
      });
    }

    const allowed = await userHasAuditAccess(req, auditId);

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

const legacyScopeFilter = async (req) => {
  if (!req.user?.id) return null;
  switch (req.permission?.scope) {
    case "all": return {};
    case "own": return { auditorId: req.user.id };
    case "assigned": return exports.getAssignedAuditFilter(req);
    case "department": {
      if (!req.user.departmentId) return null;
      const snapshots = await AuditDepartmentSnapshot.find({ departmentId: req.user.departmentId })
        .select("auditId").lean();
      return { _id: { $in: snapshots.map(item => item.auditId) } };
    }
    default: return null;
  }
};

exports.getAuditScopeFilter = async req => {
  // Internal reviewer resolution also uses this function, without route middleware.
  // A role promotion never removes an existing profile's restrictions.
  const profile = req.auditorProfile;
  if ((req.user?.role === 'auditor' && !profile) ||
      (profile && (!profile.active || profile.organizationId !== 'gfc' ||
        !require('../services/auditDirection.service').canonicalDirection(profile.direction)))) return null;
  const base = await legacyScopeFilter(req);
  if (base === null) return null;
  const Context = require('../models/auditContext.model');
  const foreignContexts = await Context.find({ organizationId: { $ne: 'gfc' } }).select('_id').lean();
  const parts = [base, { archivedAt: null }, { _id: { $nin: foreignContexts.map(item => item._id) } }];
  // HR auditors never gain other restaurants through an analytics/report all grant.
  // Management accounts and the three other audit directions retain their scopes.
  if(req.user?.role==='auditor'&&req.auditorProfile?.direction==='hr'){
    parts.push(await exports.getAssignedAuditFilter({...req,permission:{scope:'assigned'}}));
  }
  if (req.auditorProfile) {
    const restaurants = await require('../models/restaurant.model').find({ organizationId: req.auditorProfile.organizationId, brandId: { $in: require('../services/auditCatalog.service').brandIds } }).select('id').lean();
    parts.push({ restaurantId: { $in: restaurants.map(item => item.id) }, auditType: { $in: require('../services/auditDirection.service').aliasesFor(req.auditorProfile.direction) } });
  }
  return { $and: parts };
};

exports.requireAuditAccess = async (req, res, next) => {
  try {
    const filter = await exports.getAuditScopeFilter(req);
    if (filter === null) return res.status(403).json({ message: "Audit scope icazəsi yoxdur." });
    const identifier = await getAuditIdFromRequest(req);
    if (!identifier || typeof identifier !== "string") {
      return res.status(req.permission.scope === "all" ? 400 : 403).json({ message: "Audit id tələb olunur." });
    }
    const audit = req.auditScopeId
      ? await Audit.findById(req.auditScopeId).select("_id id auditorId").lean()
      : await findAuditByIdentifier(identifier);
    if (!audit) return res.status(req.permission.scope === "all" ? 404 : 403).json({ message: "Audit tapılmadı və ya giriş icazəsi yoxdur." });
    if (!(await Audit.exists({ $and: [{ _id: audit._id }, filter] }))) {
      return res.status(403).json({ message: "Bu Audit üzərində əməliyyat icazəniz yoxdur." });
    }
    req.auditScopeId = String(audit._id);
    next();
  } catch (error) {
    console.error("Audit access error:", error);
    return res.status(500).json({ message: "Audit scope yoxlanıla bilmədi." });
  }
};

// Only for routes whose URL/body identifies a parent Audit, never a child id.
// Controllers must query the exact parent that was authorized, including when
// callers use a public UUID or an id that aliases another record's Mongo id.
exports.requireAuditParentAccess = (req, res, next) => exports.requireAuditAccess(req, res, async () => {
  try {
    if (req.body?.executionId) {
      const Execution = require("../models/auditExecution.model");
      if (!mongoose.Types.ObjectId.isValid(req.body.executionId) ||
          !(await Execution.exists({ _id: req.body.executionId, auditId: req.auditScopeId }))) {
        return res.status(400).json({ message: "Execution bu Audit-ə aid deyil." });
      }
    }
    if (req.params.auditId) req.params.auditId = req.auditScopeId;
    if (req.params.id) req.params.id = req.auditScopeId;
    if (req.body?.auditId) req.body.auditId = req.auditScopeId;
    next();
  } catch (error) {
    console.error("Audit parent check error:", error);
    return res.status(500).json({ message: "Audit əlaqəsi yoxlanıla bilmədi." });
  }
});

exports.getAuditChildScopeFilter = async (req, narrowedParentFilter) => {
  const filter = await exports.getAuditScopeFilter(req);
  if (filter === null) return null;

  const audits = await Audit.find(narrowedParentFilter ? {$and:[filter,narrowedParentFilter]} : filter).select("_id").lean();
  return { auditId: { $in: audits.map(audit => audit._id) } };
};
