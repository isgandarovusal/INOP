const Audit = require("../models/audit.model");

function buildAuditFilter(req, auditType) {
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

  return filter;
}

exports.getStandardAudits = async (req, res) => {
  try {
    const filter = buildAuditFilter(req, "standard");

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
    const filter = buildAuditFilter(req, "service");

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
