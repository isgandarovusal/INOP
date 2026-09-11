const Audit = require("../models/audit.model");

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(safeNumber(value) * factor) / factor;
}

exports.getSummary = async (req, res) => {
  try {
    const result = await Audit.aggregate([
      {
        $group: {
          _id: {
            $ifNull: ["$status", "unknown"],
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          value: -1,
        },
      },
    ]);

    const totalResult = await Audit.aggregate([
      {
        $count: "total",
      },
    ]);

    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        total,
        statusSummary: result.map((item) => ({
          name: item._id || "unknown",
          value: item.value,
        })),
      },
    });
  } catch (error) {
    console.error("Audit summary analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Analytics error",
    });
  }
};

exports.getByType = async (req, res) => {
  try {
    const result = await Audit.aggregate([
      {
        $group: {
          _id: {
            $ifNull: ["$auditType", "unknown"],
          },
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          value: -1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        typeSummary: result.map((item) => ({
          name: item._id || "unknown",
          value: item.value,
        })),
      },
    });
  } catch (error) {
    console.error("Audit type analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Type analytics error",
    });
  }
};

exports.getTrend = async (req, res) => {
  try {
    const result = await Audit.aggregate([
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
          value: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        trend: result.map((item) => ({
          label: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
          value: item.value,
        })),
      },
    });
  } catch (error) {
    console.error("Audit trend analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Trend analytics error",
    });
  }
};

exports.getServiceAnalytics = async (req, res) => {
  try {
    const [summary] = await Audit.aggregate([
      {
        $match: {
          auditType: "service",
        },
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                averageOverallPercentage: {
                  $avg: {
                    $convert: {
                      input: "$overallPercentage",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
              },
            },
          ],

          answers: [
            {
              $unwind: {
                path: "$checks",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: {
                  $toLower: {
                    $ifNull: ["$checks.answer", ""],
                  },
                },
                value: { $sum: 1 },
              },
            },
          ],

          serviceTime: [
            {
              $unwind: {
                path: "$serviceTimeObservations",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: null,
                averageSeconds: {
                  $avg: {
                    $convert: {
                      input: "$serviceTimeObservations.seconds",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
              },
            },
          ],

          trend: [
            {
              $group: {
                _id: "$date",
                value: { $sum: 1 },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
            {
              $limit: 12,
            },
          ],
        },
      },
    ]);

    const overview = summary?.overview?.[0] || {};
    const serviceTime = summary?.serviceTime?.[0];

    const answerMap = {
      yes: 0,
      no: 0,
      na: 0,
    };

    for (const item of summary?.answers || []) {
      const key = String(item._id || "").toLowerCase();

      if (key === "yes" || key === "y" || key === "bəli") {
        answerMap.yes += item.value;
      } else if (key === "no" || key === "n" || key === "xeyr") {
        answerMap.no += item.value;
      } else if (key === "na" || key === "n/a") {
        answerMap.na += item.value;
      }
    }

    res.json({
      success: true,
      data: {
        total: overview.total || 0,
        averageOverallPercentage: round(
          overview.averageOverallPercentage
        ),
        answerDistribution: [
          { name: "Yes", value: answerMap.yes },
          { name: "No", value: answerMap.no },
          { name: "N/A", value: answerMap.na },
        ],
        averageServiceTimeSeconds: round(
          serviceTime?.averageSeconds
        ),
        trend: (summary?.trend || []).map((item) => ({
          label: item._id || "unknown",
          value: item.value,
        })),
      },
    });
  } catch (error) {
    console.error("Service analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Service analytics error",
    });
  }
};

exports.getStandardAnalytics = async (req, res) => {
  try {
    const [summary] = await Audit.aggregate([
      {
        $match: {
          auditType: "standard",
        },
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                averageCompliancePercentage: {
                  $avg: {
                    $convert: {
                      input: "$compliancePercentage",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
                totalCritical: {
                  $sum: {
                    $convert: {
                      input: "$foundCritical",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
                totalMajor: {
                  $sum: {
                    $convert: {
                      input: "$foundMajor",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
                totalMinor: {
                  $sum: {
                    $convert: {
                      input: "$foundMinor",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
                passed: {
                  $sum: {
                    $cond: [
                      { $eq: ["$passed", true] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],

          trend: [
            {
              $group: {
                _id: "$date",
                value: {
                  $avg: {
                    $convert: {
                      input: "$compliancePercentage",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
            {
              $limit: 12,
            },
          ],
        },
      },
    ]);

    const overview = summary?.overview?.[0] || {};

    res.json({
      success: true,
      data: {
        total: overview.total || 0,
        averageCompliancePercentage: round(
          overview.averageCompliancePercentage
        ),
        findings: {
          critical: safeNumber(overview.totalCritical),
          major: safeNumber(overview.totalMajor),
          minor: safeNumber(overview.totalMinor),
        },
        passed: safeNumber(overview.passed),
        failed: Math.max(
          0,
          safeNumber(overview.total) - safeNumber(overview.passed)
        ),
        trend: (summary?.trend || []).map((item) => ({
          label: item._id || "unknown",
          value: round(item.value),
        })),
      },
    });
  } catch (error) {
    console.error("Standard analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Standard analytics error",
    });
  }
};

exports.getSafetyAnalytics = async (req, res) => {
  try {
    const [summary] = await Audit.aggregate([
      {
        $match: {
          auditType: "occupational-safety",
        },
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                averageScorePercentage: {
                  $avg: {
                    $convert: {
                      input: "$scorePercentage",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
                averageTotalScore: {
                  $avg: {
                    $convert: {
                      input: "$totalScore",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
                averageMaxScore: {
                  $avg: {
                    $convert: {
                      input: "$maxScore",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
              },
            },
          ],

          checks: [
            {
              $unwind: {
                path: "$checks",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: null,
                answered: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$checks.score", null] },
                          { $ne: ["$checks.score", ""] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                total: { $sum: 1 },
              },
            },
          ],

          distribution: [
            {
              $unwind: {
                path: "$checks",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: "$checks.score",
                value: { $sum: 1 },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],

          trend: [
            {
              $group: {
                _id: "$date",
                value: {
                  $avg: {
                    $convert: {
                      input: "$scorePercentage",
                      to: "double",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
            {
              $limit: 12,
            },
          ],
        },
      },
    ]);

    const overview = summary?.overview?.[0] || {};
    const checks = summary?.checks?.[0] || {};

    res.json({
      success: true,
      data: {
        total: overview.total || 0,
        averageScorePercentage: round(
          overview.averageScorePercentage
        ),
        averageTotalScore: round(
          overview.averageTotalScore
        ),
        averageMaxScore: round(
          overview.averageMaxScore
        ),
        answered: checks.answered || 0,
        totalChecks: checks.total || 0,
        distribution: (summary?.distribution || []).map((item) => ({
          name:
            item._id === null || item._id === undefined
              ? "Unanswered"
              : String(item._id),
          value: item.value,
        })),
        trend: (summary?.trend || []).map((item) => ({
          label: item._id || "unknown",
          value: round(item.value),
        })),
      },
    });
  } catch (error) {
    console.error("Safety analytics error:", error);

    res.status(500).json({
      success: false,
      message: "Safety analytics error",
    });
  }
};
