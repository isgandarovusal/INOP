const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const { createAuditWithDepartmentSnapshot } = require("../services/auditCreation.service");
const { recordActivity } = require("../services/activityLog.service");
const {
  getAuditScopeFilter,
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

function normalizeAuditPayload(body, req) {
  return {
    ...body,
    id: body.id,
    restaurantId: body.restaurantId,
    auditorId: req.user?.id || "unknown",
    auditType: body.auditType,
    date: body.date,
  };
}

async function getAuditFilter(req, extra = {}) {
  const scopeFilter = await getAuditScopeFilter(req);

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

async function getAudits(req, res) {
  try {
    const filter = await require('./auditDirectionAnalytics.controller').filterFor(req);

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const window = require('../services/auditQuery.service').pagination(req);
    const paged = req.query.page !== undefined || req.query.limit !== undefined || req.query.format === 'page';
    if(req.query.format!==undefined && req.query.format!=='page')throw Object.assign(new Error('Invalid response format.'),{status:400});
    let query=Audit.find(filter).sort({date:-1,createdAt:-1,_id:-1}).maxTimeMS(5000);
    if(paged)query=query.skip(window.skip).limit(window.limit);
    const audits=await query;
    if(req.query.format==='page'){const total=await Audit.countDocuments(filter).maxTimeMS(5000);return res.json({items:audits,total,page:window.page,limit:window.limit});}
    res.json(audits);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Failed to fetch audits:", error);
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
    console.error("Failed to fetch audit:", error);
    res.status(500).json({
      message: "Failed to fetch audit",
    });
  }
}

async function createAudit(req, res) {
  try {
    const payload = normalizeAuditPayload(req.body, req);

    if (!payload.id) {
      return res.status(400).json({
        message: "Audit id is required",
      });
    }

    const audit = await createAuditWithDepartmentSnapshot(payload, req.user);

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
          logError
        );
      }
    }

    res.status(201).json(audit);
  } catch (error) {
    console.error("Failed to create audit:", error);

    if (error.status) return res.status(error.status).json({ message: error.message });
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

async function updateAudit(req, res) {
  try {
    const payload = normalizeAuditPayload(req.body, req);

    delete payload.id;
    delete payload._id;

    const filter = await getAuditFilter(req, buildAuditIdentifierFilter(req.params.id));

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    for (const field of ['standardSubmission','standardRestaurantSnapshot','standardAuditorSnapshot','standardAssessment','standardDetails','standardVersion','serviceAssessment','serviceDetails','serviceVersion','hrAssessment','hrDetails','hrVersion','status','template','templateId','templateRevisionId','templateSnapshot','assessmentStatus','checks','results',...require('../services/auditAssessment.service').trustedFields]) delete payload[field];
    if (['photos','attachments'].some(field => (payload[field] || []).length)) return res.status(400).json({ message: 'Use private evidence uploads.' });
    delete payload.auditorId;
    delete payload.organizationId;
    delete payload.direction;
    delete payload.restaurantId;
    delete payload.auditType;

    const audit = await require('../services/auditTransaction.service').transaction(async session => {
      const existing = await Audit.findOne(filter).session(session);
      if (!existing) return null;
      await require('../services/auditLifecycle.service').lockAudit(existing._id, session, req.user);
      if(existing.templateSnapshot?.standardSource&&await require('../models/auditExecution.model').exists({auditId:existing._id,status:'completed'}).session(session))throw Object.assign(new Error('Completed Standard audit metadata is immutable.'),{status:409});
      if (await require('../models/auditClosure.model').exists({ auditId: existing._id }).session(session)) throw Object.assign(new Error('Closed audit is immutable.'), { status: 409 });
      return Audit.findOneAndUpdate(filter, { $set: payload }, { returnDocument: 'after', runValidators: true, session });
    });

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
          logError
        );
      }
    }

    res.json(audit);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Failed to update audit:", error);

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

async function deleteAudit(req, res) {
  try {
    const filter = await getAuditFilter(req, buildAuditIdentifierFilter(req.params.id));

    if (filter === null) {
      return res.status(403).json({
        message: "Audit məlumatlarına giriş icazəsi yoxdur.",
      });
    }

    const audit = await require('../services/auditTransaction.service').transaction(async session => {
      const existing = await Audit.findOne(filter).session(session); if (!existing) return null;
      const audit = await require('../services/auditLifecycle.service').lockAudit(existing._id,session,req.user);
      audit.archivedAt = new Date(); audit.archivedBy = req.user.id; await audit.save({session}); return audit;
    });

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
          logError
        );
      }
    }

    res.json({
      message: "Audit deleted successfully",
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Failed to delete audit:", error);

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
                format: "%b %Y",
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
      error
    );

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
