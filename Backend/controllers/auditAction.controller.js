const Action = require("../models/auditAction.model");
const { mutate } = require("../services/auditMutation.service");
const { fail, requireManager } = require("../services/policy.service");
exports.createAction = async (req, res, next) => {
  try {
    const data = await mutate(
      req,
      "action",
      "created",
      async (session, audit) =>
        (
          await Action.create(
            [
              {
                auditId: audit._id,
                title: req.body.title,
                description: req.body.description,
                priority: req.body.priority || "medium",
                responsible: req.body.responsible,
                dueDate: req.body.dueDate,
                status: "open",
              },
            ],
            { session },
          )
        )[0],
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
exports.getActions = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Action.find({ auditId: req.audit._id }),
    });
  } catch (e) {
    next(e);
  }
};
exports.updateActionStatus = async (req, res, next) => {
  try {
    const data = await mutate(req, "action", "updated", async (session) => {
      const a = await Action.findById(req.params.id).session(session);
      const allowed = {
        open: ["in-progress"],
        "in-progress": ["completed"],
        completed: ["verified", "rejected"],
        rejected: ["in-progress"],
        verified: [],
      };
      if (!allowed[a.status]?.includes(req.body.status))
        fail("Invalid action transition", 409);
      if (["verified", "rejected"].includes(req.body.status))
        requireManager(req);
      a.status = req.body.status;
      if (a.status === "completed") a.completedAt = new Date();
      if (["verified", "rejected"].includes(a.status)) {
        a.verifiedBy = req.user.id;
        a.verificationNote = String(req.body.verificationNote || "").slice(
          0,
          5000,
        );
        if (!a.verificationNote) fail("Verification note required", 400);
      }
      await a.save({ session });
      return a;
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
