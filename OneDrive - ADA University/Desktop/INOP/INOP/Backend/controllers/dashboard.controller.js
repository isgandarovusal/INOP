const {
  getUserPermissionScope,
} = require("../middleware/authorization.middleware");
const { getDataScope } = require("../middleware/dataScope.middleware");
const {
  getAssignedAuditFilter,
} = require("../middleware/auditScope.middleware");
async function scope(req, resource) {
  const s = await getUserPermissionScope(req.user.role, resource, "read");
  if (!s) return null;
  return getDataScope({ ...req, permission: { scope: s } });
}
exports.summary = async (req, res, next) => {
  try {
    const Job = require("../models/job.model"),
      Candidate = require("../models/candidate.model"),
      Application = require("../models/application.model");
    const js = await scope(req, "recruitment"),
      cs = await scope(req, "candidate"),
      aps = await scope(req, "application");
    const [jobs, candidates, applications, recentCandidates, statuses] =
      await Promise.all([
        js ? Job.countDocuments(js) : 0,
        cs ? Candidate.countDocuments(cs) : 0,
        aps ? Application.countDocuments(aps) : 0,
        cs
          ? Candidate.find(cs)
              .select("name role status createdAt")
              .sort({ createdAt: -1 })
              .limit(5)
              .lean()
          : [],
        aps
          ? Application.aggregate([
              {
                $match: Object.fromEntries(
                  Object.entries(aps).map(([k, v]) => [
                    k,
                    ["createdBy", "assignedTo"].includes(k)
                      ? new (require("mongoose").Types.ObjectId)(v)
                      : v,
                  ]),
                ),
              },
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ])
          : [],
      ]);
    const as = await getUserPermissionScope(req.user.role, "audit", "read");
    const filter = as
      ? await getAssignedAuditFilter({ ...req, permission: { scope: as } })
      : null;
    const audits = filter
      ? await require("../models/audit.model").countDocuments(filter)
      : 0;
    res.json({
      jobs,
      candidates,
      applications,
      audits,
      recentCandidates,
      statuses,
    });
  } catch (e) {
    next(e);
  }
};
