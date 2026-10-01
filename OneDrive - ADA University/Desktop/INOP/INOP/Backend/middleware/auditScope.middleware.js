const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const Assignment = require("../models/auditAssignment.model");
async function findAuditByIdentifier(id) {
  if (!id || typeof id !== "string") return null;
  const alternatives = [{ id }];
  if (mongoose.isValidObjectId(id)) alternatives.push({ _id: id });
  return Audit.findOne({ $or: alternatives }).lean();
}
async function getAssignedAuditFilter(req) {
  const scope = req.permission?.scope;
  if (scope === "all") return {};
  if (scope === "department")
    return req.user.departmentId
      ? { departmentId: req.user.departmentId }
      : null;
  if (scope === "own") return { auditorId: req.user.id };
  if (scope !== "assigned" || !req.user?.id) return null;
  const assignments = await Assignment.find({
    auditor: req.user.id,
    status: { $in: ["assigned", "accepted", "started", "completed"] },
  })
    .select("auditId")
    .lean();
  return {
    $or: [
      { auditorId: req.user.id },
      { _id: { $in: assignments.map((a) => a.auditId) } },
    ],
  };
}
async function userHasAuditAccess(req, id) {
  const audit = await findAuditByIdentifier(String(id || ""));
  const filter = await getAssignedAuditFilter(req);
  if (!audit || filter === null) return false;
  return Boolean(await Audit.exists({ $and: [{ _id: audit._id }, filter] }));
}
async function getAuditIdFromRequest(req) {
  const childModels = {
    "audit.approval": "auditApproval",
    "audit.execution": "auditExecution",
    "audit.action": "auditAction",
    "audit.finding": "auditFinding",
  };
  if (req.params.id && childModels[req.permission?.resource]) {
    if (!mongoose.isValidObjectId(req.params.id)) return null;
    const child = await require(
      "../models/" + childModels[req.permission.resource] + ".model",
    )
      .findById(req.params.id)
      .lean();
    req.auditChild = child;
    return child ? String(child.auditId) : null;
  }
  return req.params.auditId || req.params.id || req.body?.auditId || null;
}
async function requireAssignedAuditAccess(req, res, next) {
  try {
    const id = await getAuditIdFromRequest(req);
    const designatedReviewer =
      req.permission?.resource === "audit.approval" &&
      req.auditChild &&
      String(req.auditChild.reviewer) === req.user.id;
    if (
      !id ||
      (!designatedReviewer && !(await userHasAuditAccess(req, String(id))))
    )
      return res.status(403).json({ message: "Audit access denied." });
    req.audit = await findAuditByIdentifier(String(id));
    // Normalize public audit IDs for child endpoints and exports.
    if (req.params.auditId) req.params.auditId = String(req.audit._id);
    if (req.body?.auditId) req.body.auditId = String(req.audit._id);
    next();
  } catch (e) {
    next(e);
  }
}
module.exports = {
  findAuditByIdentifier,
  getAssignedAuditFilter,
  userHasAuditAccess,
  getAuditIdFromRequest,
  requireAssignedAuditAccess,
};
