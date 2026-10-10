const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const AuditAssignment = require("../models/auditAssignment.model");

const activeAssignmentStatuses = ["assigned", "accepted", "started", "completed"];
const childModels = {
  "audit.execution": "auditExecution",
  "audit.action": "auditAction",
  "audit.approval": "auditApproval",
  "audit.finding": "auditFinding",
};

async function getAuditIdFromRequest(req) {
  // Child identifiers must never be mistaken for the parent audit identifier.
  const childModel = childModels[req.permission?.resource];
  if (req.params?.id && childModel) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return null;
    const child = await require(`../models/${childModel}.model`)
      .findById(req.params.id).select("auditId reviewer requestedBy").lean();
    req.auditChild = child;
    return child?.auditId || null;
  }
  return req.params?.auditId || req.params?.id || req.body?.auditId || null;
}

async function findAuditByIdentifier(identifier) {
  if (!identifier || !["string", "object"].includes(typeof identifier)) return null;
  const conditions = [{ id: String(identifier) }];
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    conditions.unshift({ _id: new mongoose.Types.ObjectId(identifier) });
  }
  return Audit.findOne({ deletedAt: null, $or: conditions })
    .select("_id id auditorId createdBy departmentId status auditType updatedAt deletedAt").lean();
}

async function userHasAuditAccess(req, identifier) {
  if (!req.user?.id || !identifier) return false;
  const audit = req.audit && [String(req.audit._id), String(req.audit.id)].includes(String(identifier))
    ? req.audit : await findAuditByIdentifier(identifier);
  if (!audit || audit.deletedAt) return false;
  const scope = req.permission?.scope;
  if (scope === "all") return true;
  if (scope === "department") {
    return Boolean(req.user.departmentId && audit.departmentId &&
      String(req.user.departmentId) === String(audit.departmentId));
  }
  if (scope === "own") {
    return String(audit.createdBy || audit.auditorId || "") === String(req.user.id);
  }
  if (scope !== "assigned") return false;
  // A nominated reviewer may review the request without becoming an auditor.
  if (req.permission?.resource === "audit.approval" && req.auditChild?.reviewer &&
      String(req.auditChild.reviewer) === String(req.user.id)) return true;
  if (String(audit.auditorId || "") === String(req.user.id)) return true;
  return Boolean(await AuditAssignment.findOne({
    auditId: audit._id, auditor: req.user.id,
    status: { $in: activeAssignmentStatuses },
  }).select("_id").lean());
}

async function requireAssignedAuditAccess(req, res, next) {
  try {
    const identifier = await getAuditIdFromRequest(req);
    const audit = await findAuditByIdentifier(identifier);
    if (!audit) return res.status(404).json({ success: false, message: "Audit not found" });
    req.audit = audit;
    if (!await userHasAuditAccess(req, audit._id)) {
      return res.status(403).json({ success: false, message: "Audit access denied" });
    }
    return next();
  } catch (error) { return next(error); }
}

async function getAuditScopeFilter(req) {
  const scope = req.permission?.scope;
  if (!req.user?.id) return null;
  if (scope === "all") return { deletedAt: null };
  if (scope === "department") {
    return req.user.departmentId ? { deletedAt: null, departmentId: req.user.departmentId } : null;
  }
  if (scope === "own") {
    return { deletedAt: null, $or: [{ createdBy: req.user.id }, { createdBy: { $in: [null, ""] }, auditorId: req.user.id }] };
  }
  if (scope !== "assigned") return null;
  const assignments = await AuditAssignment.find({
    auditor: req.user.id, status: { $in: activeAssignmentStatuses },
  }).select("auditId").lean();
  return { deletedAt: null, $or: [{ auditorId: req.user.id }, { _id: { $in: assignments.map(item => item.auditId) } }] };
}

module.exports = { getAuditIdFromRequest, findAuditByIdentifier, userHasAuditAccess,
  requireAssignedAuditAccess, getAuditScopeFilter, getAssignedAuditFilter: getAuditScopeFilter };
