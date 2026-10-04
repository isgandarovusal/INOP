const Audit = require("../models/audit.model");
const AuditExecution = require("../models/auditExecution.model");

exports.getAuditDashboard = async (req, res) => {
  try {
    const scope =
      await require("../middleware/auditScope.middleware").getAssignedAuditFilter(
        req,
      );
    if (scope === null)
      return res.status(403).json({ message: "Access denied" });
    const ids = await Audit.find(scope).distinct("_id");
    const executionScope = { auditId: { $in: ids } };

    const [
      totalAudits,
      completedAudits,
      riskStats,
      typeStats,
      scoreStats,
      trend,
    ] = await Promise.all([
      Audit.countDocuments(scope),

      AuditExecution.countDocuments({
        ...executionScope,
        status: "completed",
      }),

      AuditExecution.aggregate([
        { $match: executionScope },

        {
          $group: {
            _id: "$riskLevel",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Audit.aggregate([
        { $match: scope },

        {
          $group: {
            _id: "$auditType",
            count: {
              $sum: 1,
            },
          },
        },
      ]),

      AuditExecution.aggregate([
        { $match: executionScope },

        {
          $group: {
            _id: null,
            averageScore: {
              $avg: "$totalScore",
            },
          },
        },
      ]),

      AuditExecution.aggregate([
        { $match: executionScope },

        {
          $group: {
            _id: {
              year: {
                $year: "$createdAt",
              },
              month: {
                $month: "$createdAt",
              },
            },

            count: {
              $sum: 1,
            },

            averageScore: {
              $avg: "$totalScore",
            },
          },
        },

        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,

      data: {
        totalAudits,

        completedAudits,

        averageScore: scoreStats[0]?.averageScore || 0,

        riskStats,

        typeStats,

        trend,
      },
    });
  } catch (error) {
    console.error("Audit dashboard error", error);

    res.status(500).json({
      success: false,

      message: "Dashboard analytics error",
    });
  }
};
