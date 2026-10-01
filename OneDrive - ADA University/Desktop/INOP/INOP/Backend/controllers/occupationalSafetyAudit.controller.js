const audits = require("./audits.controller");
exports.getOccupationalSafetyAudits = async (req, res, next) => {
  try {
    const filter =
      await require("../middleware/auditScope.middleware").getAssignedAuditFilter(
        req,
      );
    if (!filter) return res.status(403).json({ message: "Access denied" });
    res.json({
      success: true,
      data: await require("../models/audit.model")
        .find({ $and: [filter, { auditType: "occupational-safety" }] })
        .sort({ createdAt: -1 })
        .skip(req.pageOffset || 0)
        .limit(req.pageLimit || 100),
    });
  } catch (e) {
    next(e);
  }
};
exports.createOccupationalSafetyAudit = (req, res, next) => {
  req.body.auditType = "occupational-safety";
  return audits.createAudit(req, res, next);
};
