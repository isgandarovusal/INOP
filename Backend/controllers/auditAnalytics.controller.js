const Audit = require("../models/audit.model");
const { filterFor } = require("./auditDirectionAnalytics.controller");
const { pagination } = require("../services/auditQuery.service");
const { auditScoreExpression } = require("../services/auditScore.service");

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * factor) / factor : null;
}

exports.getSummary = async (req, res) => {
  try {
    const scopeFilter = await filterFor(req);
    if (scopeFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
    const result = await Audit.aggregate([
      { $match: scopeFilter },
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
      { $match: scopeFilter },
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

    res.status(error.status || 500).json({
      success: false,
      message: "Analytics error",
    });
  }
};

exports.getByType = async (req, res) => {
  try {
    const scopeFilter = await filterFor(req);
    if (scopeFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
    const result = await Audit.aggregate([
      { $match: scopeFilter },
      {
        $group: {
          _id: {
            $switch:{branches:require('../services/auditDirection.service').directions.map(direction=>({case:{$in:[{$ifNull:['$auditType','$type']},require('../services/auditDirection.service').aliasesFor(direction)]},then:direction})),default:{$ifNull:['$auditType',{$ifNull:['$type','unknown']}]}} ,
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

    res.status(error.status || 500).json({
      success: false,
      message: "Type analytics error",
    });
  }
};

exports.getTrend = async (req, res) => {
  try {
    const scopeFilter = await filterFor(req);
    if (scopeFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
    const result = await Audit.aggregate([
      { $match: scopeFilter },
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

    res.status(error.status || 500).json({
      success: false,
      message: "Trend analytics error",
    });
  }
};

exports.getServiceAnalytics = async (req, res) => {
  try {
    const scopeFilter = await filterFor({...req,query:req.query,params:{...req.params,direction:'service'}});
    if (scopeFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
    const legacyScope={$and:[scopeFilter,{'templateSnapshot.serviceSource':{$exists:false}}]};
    const [summary] = await Audit.aggregate([
      { $match: legacyScope },
      {
        $match: {
          auditType: "service",
        },
      },
      {$set:{normalizedScore:auditScoreExpression}},
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                scored: {$sum:{$cond:[{$isNumber:"$normalizedScore"},1,0]}},
                averageOverallPercentage: {
                  $avg: {
                    $multiply: ['$normalizedScore',10],
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
                      onError: null,
                      onNull: null,
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
                _id: -1,
              },
            },
            {$skip:pagination(req,12).skip},
            {
              $limit: pagination(req,12).limit,
            },
            {$sort:{_id:1}},
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
        legacyOnly:true, sourceAnalyticsPath:'/audit-service/analytics',
        total: overview.total || 0,
        scored:overview.scored||0,unscored:(overview.total||0)-(overview.scored||0),scoreUnit:"percent",
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

    res.status(error.status || 500).json({
      success: false,
      message: "Service analytics error",
    });
  }
};

exports.getStandardAnalytics = async (req, res) => {
  try {
    const scopeFilter = await filterFor({...req,query:req.query,params:{...req.params,direction:'standard'}});
    if (scopeFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
    const legacyScope={$and:[scopeFilter,{'templateSnapshot.standardSource':{$exists:false}}]};
    const [summary] = await Audit.aggregate([
      { $match: legacyScope },
      {
        $match: {
          auditType: "standard",
        },
      },
      {$set:{normalizedScore:auditScoreExpression}},
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                scored: {$sum:{$cond:[{$isNumber:"$normalizedScore"},1,0]}},
                averageCompliancePercentage: {
                  $avg: {
                    $multiply: ['$normalizedScore',10],
                  },
                },
                totalCritical: {
                  $sum: {
                    $convert: {
                      input: "$foundCritical",
                      to: "double",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
                totalMajor: {
                  $sum: {
                    $convert: {
                      input: "$foundMajor",
                      to: "double",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
                totalMinor: {
                  $sum: {
                    $convert: {
                      input: "$foundMinor",
                      to: "double",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
                failed: {$sum:{$cond:[{$and:[{$isNumber:"$normalizedScore"},{$eq:["$passed",false]}]},1,0]}},
                passed: {
                  $sum: {
                    $cond: [
                      { $and: [{ $isNumber: "$normalizedScore" }, { $eq: ["$passed", true] }] },
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
                    $multiply: ['$normalizedScore',10],
                  },
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {$skip:pagination(req,12).skip},
            {
              $limit: pagination(req,12).limit,
            },
            {$sort:{_id:1}},
          ],
        },
      },
    ]);

    const overview = summary?.overview?.[0] || {};

    res.json({
      success: true,
      data: {
        legacyOnly:true, sourceAnalyticsPath:'/audit-standard/analytics',
        total: overview.total || 0,
        scored:overview.scored||0,unscored:(overview.total||0)-(overview.scored||0),scoreUnit:"percent",
        averageCompliancePercentage: round(
          overview.averageCompliancePercentage
        ),
        findings: {
          critical: safeNumber(overview.totalCritical),
          major: safeNumber(overview.totalMajor),
          minor: safeNumber(overview.totalMinor),
        },
        passed: safeNumber(overview.passed),
        failed: safeNumber(overview.failed),
        outcomeUnknown:Math.max(0,(overview.scored||0)-safeNumber(overview.passed)-safeNumber(overview.failed)),
        trend: (summary?.trend || []).map((item) => ({
          label: item._id || "unknown",
          value: round(item.value),
        })),
      },
    });
  } catch (error) {
    console.error("Standard analytics error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: "Standard analytics error",
    });
  }
};

exports.getSafetyAnalytics = async (req, res) => {
  try {
    const scopeFilter = await filterFor({...req,query:req.query,params:{...req.params,direction:'occupational-safety'}});
    if (scopeFilter === null) return res.status(403).json({ success: false, message: "Audit scope icazəsi yoxdur." });
    const legacyScope={$and:[scopeFilter,{'templateSnapshot.hseSource':{$exists:false}}]};
    const [summary] = await Audit.aggregate([
      { $match: legacyScope },
      {
        $match: {
          auditType: {$in:["occupational-safety","safety"]},
        },
      },
      {$set:{normalizedScore:auditScoreExpression}},
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                scored: {$sum:{$cond:[{$isNumber:"$normalizedScore"},1,0]}},
                averageScorePercentage: {
                  $avg: {
                    $multiply: ['$normalizedScore',10],
                  },
                },
                averageTotalScore: {
                  $avg: {
                    $convert: {
                      input: "$totalScore",
                      to: "double",
                      onError: null,
                      onNull: null,
                    },
                  },
                },
                averageMaxScore: {
                  $avg: {
                    $convert: {
                      input: "$maxScore",
                      to: "double",
                      onError: null,
                      onNull: null,
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
                scored: {$sum:{$cond:[{$isNumber:"$normalizedScore"},1,0]}},
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
                    $multiply: ['$normalizedScore',10],
                  },
                },
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
            {$skip:pagination(req,12).skip},
            {
              $limit: pagination(req,12).limit,
            },
            {$sort:{_id:1}},
          ],
        },
      },
    ]);

    const overview = summary?.overview?.[0] || {};
    const checks = summary?.checks?.[0] || {};

    res.json({
      success: true,
      data: {
        legacyOnly:true, sourceAnalyticsPath:'/audit-hse/analytics',
        total: overview.total || 0,
        scored:overview.scored||0,unscored:(overview.total||0)-(overview.scored||0),scoreUnit:"percent",
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

    res.status(error.status || 500).json({
      success: false,
      message: "Safety analytics error",
    });
  }
};
