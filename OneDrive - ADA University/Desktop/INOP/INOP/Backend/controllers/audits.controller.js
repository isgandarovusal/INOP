const crypto = require("crypto");
const Audit = require("../models/audit.model");
const Template = require("../models/auditTemplate.model");
const {
  getAssignedAuditFilter,
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");
const { payload } = require("../services/auditDomain.service");
const { mutate } = require("../services/auditMutation.service");
const { fail } = require("../services/policy.service");
async function getAuditFilter(req, extra = {}) {
  const scope = await getAssignedAuditFilter(req);
  if (scope === null) fail("Audit access denied");
  return { $and: [scope, extra] };
}
async function getAudits(req, res, next) {
  try {
    const filter = await getAuditFilter(req);
    if (req.query.auditType)
      filter.$and.push({ auditType: req.query.auditType });
    res.json(
      await Audit.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(req.pageOffset || 0)
        .limit(req.pageLimit || 100),
    );
  } catch (e) {
    next(e);
  }
}
async function getAuditById(req, res, next) {
  try {
    const a = await findAuditByIdentifier(req.params.id);
    if (!a || !(await userHasAuditAccess(req, req.params.id)))
      return res.status(404).json({ message: "Audit not found" });
    res.json(a);
  } catch (e) {
    next(e);
  }
}
async function createAudit(req, res, next) {
  try {
    const data = payload(req.body);
    data.id = crypto.randomUUID();
    data.auditorId = req.user.id;
    data.departmentId = req.user.departmentId;
    data.status = "draft";
    if (data.templateId) {
      const t = await Template.findOne({
        _id: data.templateId,
        status: "active",
      }).lean();
      if (!t || t.auditType !== data.auditType)
        fail("Active matching template required", 400);
      data.templateSnapshot = t;
    }
    const a = await Audit.create(data);
    res.status(201).json(a);
  } catch (e) {
    next(e);
  }
}
async function updateAudit(req, res, next) {
  try {
    req.audit = await findAuditByIdentifier(req.params.id);
    if (!req.audit || !(await userHasAuditAccess(req, req.params.id)))
      fail("Audit access denied");
    if (req.body.templateId && req.body.templateId !== req.audit.templateId)
      fail("Create a new audit to change its template.", 409);
    if (req.body.status && req.body.status !== req.audit.status)
      fail("Use workflow/closure endpoints to change status.", 409);
    const a = await mutate(req, "audit", "updated", async (session, audit) => {
      Object.assign(audit, payload(req.body, audit.toObject()));
      await audit.save({ session });
      return audit;
    });
    res.json(a);
  } catch (e) {
    next(e);
  }
}
async function deleteAudit(req, res, next) {
  try {
    req.audit = await findAuditByIdentifier(req.params.id);
    if (!req.audit || !(await userHasAuditAccess(req, req.params.id)))
      fail("Audit access denied");
    const files = [
      ...(req.audit.photos || []),
      ...(req.audit.attachments || []),
    ];
    await mutate(req, "audit", "deleted", async (session, audit) => {
      for (const model of [
        "auditFinding",
        "auditAssignment",
        "auditApproval",
        "auditExecution",
        "auditAction",
        "auditClosure",
      ])
        if (
          await require("../models/" + model + ".model")
            .exists({ auditId: audit._id })
            .session(session)
        )
          fail(
            "Audit has related workflow records; cancel/archive it instead.",
            409,
          );
      await Audit.deleteOne({ _id: audit._id }, { session });
      return null;
    });
    for (const file of files)
      await require("./files.controller").cleanup(file.blobUrl);
    res.json({ message: "Audit deleted" });
  } catch (e) {
    next(e);
  }
}
async function getAuditAnalytics(req, res, next) {
  try {
    const filter = await getAuditFilter(req);
    const audits = await Audit.aggregate([
      { $match: filter },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                overallScore: { $avg: { $divide: ["$overallPercentage", 10] } },
                totalAudits: { $sum: 1 },
                restaurants: { $addToSet: "$restaurantId" },
                criticalCount: {
                  $sum: { $cond: [{ $lt: ["$overallPercentage", 70] }, 1, 0] },
                },
              },
            },
          ],
          restaurantComparison: [
            {
              $group: {
                _id: "$restaurantId",
                score: { $avg: { $divide: ["$overallPercentage", 10] } },
              },
            },
            {
              $project: {
                _id: 0,
                restaurantId: "$_id",
                name: "$_id",
                score: 1,
              },
            },
          ],
          historicalTrend: [
            {
              $group: {
                _id: { $substrBytes: ["$date", 0, 7] },
                score: { $avg: { $divide: ["$overallPercentage", 10] } },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, label: "$_id", score: 1 } },
          ],
          categoryAnalysis: [
            { $match: { scores: { $ne: null } } },
            {
              $group: {
                _id: null,
                food: { $avg: "$scores.food" },
                cleanliness: { $avg: "$scores.cleanliness" },
                staff: { $avg: "$scores.staff" },
                service: { $avg: "$scores.service" },
              },
            },
          ],
        },
      },
    ]);
    const d = audits[0],
      s = d.summary[0] || {};
    res.json({
      overallScore: s.overallScore || 0,
      totalAudits: s.totalAudits || 0,
      restaurantsAudited: s.restaurants?.length || 0,
      criticalCount: s.criticalCount || 0,
      restaurantComparison: d.restaurantComparison,
      historicalTrend: d.historicalTrend,
      categoryAnalysis: ["food", "cleanliness", "staff", "service"].map(
        (category) => ({
          category,
          score: d.categoryAnalysis[0]?.[category] || 0,
        }),
      ),
    });
  } catch (e) {
    next(e);
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
