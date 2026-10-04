const { mutate } = require("../services/auditMutation.service");
const { fail } = require("../services/policy.service");
exports.getSafetyDetails = async (req, res) =>
  res.json({
    success: true,
    data: req.audit.safetyDetails || { riskLevel: "low", violations: [] },
  });
exports.updateSafetyDetails = async (req, res, next) => {
  try {
    const risk = req.body.riskLevel;
    if (!["low", "medium", "high", "critical"].includes(risk))
      fail("Invalid risk level", 400);
    const data = await mutate(req, "safety", "updated", async (session, a) => {
      a.safetyDetails = {
        riskLevel: risk,
        violations: Array.isArray(req.body.violations)
          ? req.body.violations.slice(0, 1000)
          : [],
        correctiveAction: String(req.body.correctiveAction || "").slice(
          0,
          5000,
        ),
        responsiblePerson: String(req.body.responsiblePerson || ""),
        deadline: req.body.deadline || null,
      };
      await a.save({ session });
      return a.safetyDetails;
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
