const Audit = require("../models/audit.model");
const { listRecords } = require("../utils/listQuery");
const { getAuditScopeFilter } = require("../middleware/auditScope.middleware");

function buildAuditFilter(req, auditType) {
  const filter = {
    auditType,
  };

  const { status, restaurantId, from, to } = req.query;

  if (typeof status === "string") {
    filter.status = status;
  }

  if (typeof restaurantId === "string") {
    filter.restaurantId = restaurantId;
  }

  if (from || to) {
    filter.date = {};

    if (typeof from === "string") {
      filter.date.$gte = from;
    }

    if (typeof to === "string") {
      filter.date.$lte = to;
    }
  }

  return filter;
}

exports.getStandardAudits = async (req, res, next) => {
  try {
    const scope = await getAuditScopeFilter(req);
    if (scope === null) return res.status(403).json({ success: false, message: "Audit access denied" });
    const filter = { $and: [scope, buildAuditFilter(req, "standard")] };

    const audits = await listRecords(Audit, filter, req, res, { sort: { date: -1, createdAt: -1, _id: -1 } });

    res.json({
      success: true,
      auditType: "standard",
      count: audits.length,
      data: audits,
    });
  } catch (error) {
    if (error.status || error.statusCode) return next(error);
    console.error("Standard audit error:", error?.name || "Error");

    res.status(500).json({
      success: false,
      message: "Standard audit error",
    });
  }
};

exports.getServiceAudits = async (req, res, next) => {
  try {
    const scope = await getAuditScopeFilter(req);
    if (scope === null) return res.status(403).json({ success: false, message: "Audit access denied" });
    const filter = { $and: [scope, buildAuditFilter(req, "service")] };

    const audits = await listRecords(Audit, filter, req, res, { sort: { date: -1, createdAt: -1, _id: -1 } });

    res.json({
      success: true,
      auditType: "service",
      count: audits.length,
      data: audits,
    });
  } catch (error) {
    if (error.status || error.statusCode) return next(error);
    console.error("Service audit error:", error?.name || "Error");

    res.status(500).json({
      success: false,
      message: "Service audit error",
    });
  }
};
