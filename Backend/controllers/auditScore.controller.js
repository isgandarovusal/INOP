const { mutate } = require("../services/auditMutation.service");
const { calculateScore } = require("../services/auditDomain.service");
exports.calculateScore = async (req, res, next) => {
  try {
    const data = await mutate(req, "score", "updated", async (session, a) => {
      a.overallPercentage = calculateScore(a);
      await a.save({ session });
      return a;
    });
    res.json({ success: true, score: data.overallPercentage, data });
  } catch (e) {
    next(e);
  }
};
