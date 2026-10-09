const Audit = require("../models/audit.model");
const { getAuditScopeFilter } = require("../middleware/auditScope.middleware");

async function buildAuditFilter(req, auditType) {
  const scopeFilter = await getAuditScopeFilter(req);
  if (scopeFilter === null) return null;
  const filter = {
    auditType,
  };

  const { status, restaurantId, from, to } = req.query;

  if (status) {
    filter.status = status;
  }

  if (restaurantId) {
    filter.restaurantId = restaurantId;
  }

  if (from || to) {
    filter.date = {};

    if (from) {
      filter.date.$gte = from;
    }

    if (to) {
      filter.date.$lte = to;
    }
  }

  return { $and: [filter, scopeFilter] };
}

exports.getStandardAudits = async (req, res) => {
  try {
    const filter = await buildAuditFilter(req, "standard");
    if (filter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });

    const audits = await Audit.find(filter).sort({
      date: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      auditType: "standard",
      count: audits.length,
      data: audits,
    });
  } catch (error) {
    console.error("Standard audit error:", error);

    res.status(500).json({
      success: false,
      message: "Standard audit error",
    });
  }
};

exports.getServiceAudits = async (req, res) => {
  try {
    const filter = await buildAuditFilter(req, "service");
    if (filter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });

    const audits = await Audit.find(filter).sort({
      date: -1,
      createdAt: -1,
    });

    res.json({
      success: true,
      auditType: "service",
      count: audits.length,
      data: audits,
    });
  } catch (error) {
    console.error("Service audit error:", error);

    res.status(500).json({
      success: false,
      message: "Service audit error",
    });
  }
};
