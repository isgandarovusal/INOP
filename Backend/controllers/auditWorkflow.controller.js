const { mutate } = require("../services/auditMutation.service");
const { transition } = require("../services/auditDomain.service");
exports.updateAuditStatus = async (req, res, next) => {
  try {
    const data = await mutate(
      req,
      "workflow",
      "updated",
      async (session, audit) => {
        transition(audit.status, req.body.status);
        audit.status = req.body.status;
        await audit.save({ session });
        return audit;
      },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
