const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const { listRecords } = require("../utils/listQuery");
const { recordActivity } = require("../services/activityLog.service");
const {
  getAssignedAuditFilter,
} = require("../middleware/auditScope.middleware");

function buildAuditIdentifierFilter(identifier) {
  const conditions = [{ id: String(identifier) }];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    conditions.push({
      _id: new mongoose.Types.ObjectId(identifier),
    });
  }

  return {
    $or: conditions,
  };
}

const { normalizeAuditPayload } = require("../services/auditPayload.service");
const { badRequest } = require("../services/auditPolicy.service");

async function getAuditFilter(req, extra = {}) {
  const scopeFilter = await getAssignedAuditFilter(req);

  if (scopeFilter === null) {
    return null;
  }

  const filters = [];

  if (Object.keys(extra).length > 0) {
    filters.push(extra);
  }

  if (Object.keys(scopeFilter).length > 0) {
    filters.push(scopeFilter);
  }

  if (filters.length === 0) {
    return {};
  }

  if (filters.length === 1) {
    return filters[0];
  }

  return {
    $and: filters,
  };
}

async function getAudits(req, res, next) {
  try {
    const filter = await getAuditFilter(req);

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const audits = await listRecords(Audit, filter, req, res, { sort: { date: -1, createdAt: -1, _id: -1 } });

    res.json(audits);
  } catch (error) {
    if (error.status || error.statusCode) return next(error);
    console.error("Failed to fetch audits:", error?.name || "Error");
    res.status(500).json({
      message: "Failed to fetch audits",
    });
  }
}

async function getAuditById(req, res) {
  try {
    const filter = await getAuditFilter(req, buildAuditIdentifierFilter(req.params.id));

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const audit = await Audit.findOne(filter);

    if (!audit) {
      return res.status(404).json({
        message:
          "Audit tapılmadı və ya bu Audit-ə giriş icazəniz yoxdur.",
      });
    }

    res.json(audit);
  } catch (error) {
    console.error("Failed to fetch audit:", error?.name || "Error");
    res.status(500).json({
      message: "Failed to fetch audit",
    });
  }
}

async function createAudit(req, res, next) {
  try {
    const payload = normalizeAuditPayload(req.body, req);

    if (!payload.id) {
      return res.status(400).json({
        message: "Audit id is required",
      });
    }

    const audit = await Audit.create(payload);

    if (audit.auditType === "service") {
      try {
        await recordActivity({
          req,
          action: "create",
          entityType: "service_audit",
          entityId: String(audit._id),
          description: `Servis auditi yaradıldı: ${audit.id}`,
        });
      } catch (logError) {
        console.error(
          "Failed to create activity log for audit:",
          logError?.name || "Error");
      }
    }

    res.status(201).json(audit);
  } catch (error) {
    if (error.statusCode) return next(error);
    console.error("Failed to create audit:", error?.name || "Error");

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Audit id already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid audit data",
        errors: error.errors,
      });
    }

    res.status(500).json({
      message: "Failed to create audit",
    });
  }
}

async function updateAudit(req, res, next) {
  try {

    const filter = await getAuditFilter(req, buildAuditIdentifierFilter(req.params.id));

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const existing = await Audit.findOne(filter).lean();
    if (!existing) throw badRequest('Audit not found', 404);
    if (['completed', 'cancelled'].includes(existing.status)) throw badRequest('A closed audit cannot be edited', 409);
    if (req.body.status !== undefined && req.body.status !== existing.status) throw badRequest('Use the workflow status endpoint');
    const payload = normalizeAuditPayload(req.body, req, false, existing);

    const audit = await Audit.findOneAndUpdate(
      { $and: [filter, { status: existing.status, updatedAt: existing.updatedAt }] },
      { $set: payload },
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );

    if (!audit) {
      return res.status(404).json({
        message:
          "Audit tapılmadı və ya bu Audit-i dəyişmək üçün icazəniz yoxdur.",
      });
    }

    if (audit.auditType === "service") {
      try {
        await recordActivity({
          req,
          action: "update",
          entityType: "service_audit",
          entityId: String(audit._id),
          description: `Servis auditi yeniləndi: ${audit.id}`,
        });
      } catch (logError) {
        console.error(
          "Failed to create activity log for audit:",
          logError?.name || "Error");
      }
    }

    res.json(audit);
  } catch (error) {
    if (error.statusCode) return next(error);
    console.error("Failed to update audit:", error?.name || "Error");

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid audit data",
        errors: error.errors,
      });
    }

    res.status(500).json({
      message: "Failed to update audit",
    });
  }
}

async function deleteAudit(req, res, next) {
  try {
    const filter = await getAuditFilter(req, buildAuditIdentifierFilter(req.params.id));

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const audit = await Audit.findOneAndUpdate(
      { $and: [filter, { status: { $nin: ['completed', 'cancelled'] } }] },
      { $set: { deletedAt: new Date(), status: 'cancelled' } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!audit) {
      return res.status(404).json({
        message:
          "Audit tapılmadı və ya bu Audit-i silmək üçün icazəniz yoxdur.",
      });
    }

    if (audit.auditType === "service") {
      try {
        await recordActivity({
          req,
          action: "delete",
          entityType: "service_audit",
          entityId: String(audit._id),
          description: `Servis auditi silindi: ${audit.id}`,
        });
      } catch (logError) {
        console.error(
          "Failed to create activity log for audit:",
          logError?.name || "Error");
      }
    }

    res.json({
      message: "Audit deleted successfully",
    });
  } catch (error) {
    if (error.status || error.statusCode) return next(error);
    console.error("Failed to delete audit:", error?.name || "Error");

    res.status(500).json({
      message: "Failed to delete audit",
    });
  }
}

async function getAuditAnalytics(req, res) {
  try {
    const filter = await getAuditFilter(req);

    if (filter === null) {
      return res.status(403).json({
        message: "Audit analytics məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const [summary] = await Audit.aggregate([
      {
        $match: filter,
      },
      {
        $addFields: {
          calculatedOverallScore: {
            $divide: [
              {
                $add: [
                  "$scores.cleanliness",
                  "$scores.service",
                  "$scores.food",
                  "$scores.staff",
                ],
              },
              4,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          overallScore: {
            $avg: "$calculatedOverallScore",
          },
          totalAudits: {
            $sum: 1,
          },
          restaurants: {
            $addToSet: "$restaurantId",
          },
          criticalCount: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    "$calculatedOverallScore",
                    7,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    if (!summary) {
      return res.json({
        overallScore: 0,
        totalAudits: 0,
        restaurantsAudited: 0,
        criticalCount: 0,
        restaurantComparison: [],
        categoryAnalysis: [],
        historicalTrend: [],
      });
    }

    const [
      restaurantComparison,
      categoryAnalysis,
      historicalTrend,
    ] = await Promise.all([
      Audit.aggregate([
        {
          $match: filter,
        },
        {
          $group: {
            _id: "$restaurantId",
            score: {
              $avg: {
                $divide: [
                  {
                    $add: [
                      "$scores.cleanliness",
                      "$scores.service",
                      "$scores.food",
                      "$scores.staff",
                    ],
                  },
                  4,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            restaurantId: "$_id",
            name: "$_id",
            score: {
              $round: ["$score", 1],
            },
          },
        },
        {
          $sort: {
            score: -1,
          },
        },
      ]),

      Audit.aggregate([
        {
          $match: filter,
        },
        {
          $group: {
            _id: null,
            food: {
              $avg: "$scores.food",
            },
            cleanliness: {
              $avg: "$scores.cleanliness",
            },
            staff: {
              $avg: "$scores.staff",
            },
            service: {
              $avg: "$scores.service",
            },
          },
        },
        {
          $project: {
            _id: 0,
            categories: [
              {
                category: "Food",
                score: {
                  $round: ["$food", 1],
                },
              },
              {
                category: "Cleanliness",
                score: {
                  $round: ["$cleanliness", 1],
                },
              },
              {
                category: "Staff",
                score: {
                  $round: ["$staff", 1],
                },
              },
              {
                category: "Service",
                score: {
                  $round: ["$service", 1],
                },
              },
            ],
          },
        },
        {
          $unwind: "$categories",
        },
        {
          $replaceRoot: {
            newRoot: "$categories",
          },
        },
        {
          $sort: {
            score: -1,
          },
        },
      ]),

      Audit.aggregate([
        {
          $match: filter,
        },
        {
          $addFields: {
            auditDate: {
              $dateFromString: {
                dateString: "$date",
                format: "%Y-%m-%d",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        {
          $match: {
            auditDate: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$auditDate",
              },
              month: {
                $month: "$auditDate",
              },
            },
            score: {
              $avg: {
                $divide: [
                  {
                    $add: [
                      "$scores.cleanliness",
                      "$scores.service",
                      "$scores.food",
                      "$scores.staff",
                    ],
                  },
                  4,
                ],
              },
            },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
        {
          $project: {
            _id: 0,
            label: {
              $dateToString: {
                format: "%b %y",
                date: {
                  $dateFromParts: {
                    year: "$_id.year",
                    month: "$_id.month",
                    day: 1,
                  },
                },
              },
            },
            score: {
              $round: ["$score", 1],
            },
          },
        },
      ]),
    ]);

    res.json({
      overallScore:
        Math.round(summary.overallScore * 10) / 10,
      totalAudits: summary.totalAudits,
      restaurantsAudited:
        summary.restaurants.length,
      criticalCount: summary.criticalCount,
      restaurantComparison,
      categoryAnalysis,
      historicalTrend,
    });
  } catch (error) {
    console.error(
      "Failed to calculate audit analytics:",
      error?.name || "Error");

    res.status(500).json({
      message: "Failed to calculate audit analytics",
    });
  }
}

module.exports = {
  getAudits,
  getAuditById,
  createAudit,
  updateAudit,
  deleteAudit,
  getAuditAnalytics,
};
