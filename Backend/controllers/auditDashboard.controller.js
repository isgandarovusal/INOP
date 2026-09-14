const Audit = require("../models/audit.model");
const AuditExecution = require("../models/auditExecution.model");
const {
  getAssignedAuditFilter,
} = require("../middleware/auditScope.middleware");

function parseDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

async function buildAuditFilter(req) {
  const scopeFilter = await getAssignedAuditFilter(req);

  if (scopeFilter === null) {
    return null;
  }

  const filter = { ...(scopeFilter || {}) };
  const { status, auditType, auditorId, restaurantId, from, to } = req.query;

  if (status) filter.status = String(status).trim();
  if (auditType) filter.auditType = String(auditType).trim();
  if (auditorId) filter.auditorId = String(auditorId).trim();
  if (restaurantId) filter.restaurantId = String(restaurantId).trim();

  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  return filter;
}

exports.getAuditDashboard = async (req, res) => {
  try {
    const auditFilter = await buildAuditFilter(req);

    if (auditFilter === null) {
      return res.status(403).json({
        success: false,
        message: "Audit məlumat səviyyəsi müəyyən edilə bilmədi.",
      });
    }

    const auditIds = await Audit.find(auditFilter).distinct("_id");
    const executionFilter = {
      auditId: { $in: auditIds },
    };

    const [
      totalAudits,
      completedAudits,
      pendingAudits,
      riskStats,
      typeStats,
      statusStats,
      auditorStats,
      scoreStats,
      trend,
    ] = await Promise.all([
      Audit.countDocuments(auditFilter),

      AuditExecution.countDocuments({
        ...executionFilter,
        status: "completed",
      }),

      Audit.countDocuments({
        $and: [auditFilter, { status: { $ne: "completed" } }],
      }),

      AuditExecution.aggregate([
        { $match: executionFilter },
        {
          $group: {
            _id: { $ifNull: ["$riskLevel", "unknown"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      Audit.aggregate([
        { $match: auditFilter },
        {
          $group: {
            _id: { $ifNull: ["$auditType", "unknown"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      Audit.aggregate([
        { $match: auditFilter },
        {
          $group: {
            _id: { $ifNull: ["$status", "unknown"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      Audit.aggregate([
        { $match: auditFilter },
        {
          $group: {
            _id: { $ifNull: ["$auditorId", "unknown"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      AuditExecution.aggregate([
        { $match: executionFilter },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$totalScore" },
          },
        },
      ]),

      AuditExecution.aggregate([
        { $match: executionFilter },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            averageScore: { $avg: "$totalScore" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      data: {
        totalAudits,
        completedAudits,
        pendingAudits,
        averageScore: Number(
          Number(scoreStats[0]?.averageScore || 0).toFixed(2)
        ),
        riskStats,
        typeStats,
        statusStats,
        auditorStats,
        trend: trend.map((item) => ({
          ...item,
          averageScore: Number(Number(item.averageScore || 0).toFixed(2)),
        })),
      },
      filters: {
        status: req.query.status || null,
        auditType: req.query.auditType || null,
        auditorId: req.query.auditorId || null,
        restaurantId: req.query.restaurantId || null,
        from: req.query.from || null,
        to: req.query.to || null,
      },
    });
  } catch (error) {
    console.error("Audit dashboard error", error);

    return res.status(500).json({
      success: false,
      message: "Dashboard analytics error",
    });
  }
};

module.exports.buildAuditFilter = buildAuditFilter;
