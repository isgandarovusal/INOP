const Finding = require("../models/auditFinding.model");
const { mutate } = require("../services/auditMutation.service");
const { fail } = require("../services/policy.service");
exports.getFindings = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Finding.find({ auditId: req.audit._id }).sort({
        createdAt: -1,
      }),
    });
  } catch (e) {
    next(e);
  }
};
exports.createFinding = async (req, res, next) => {
  try {
    const data = await mutate(
      req,
      "finding",
      "created",
      async (session, audit) =>
        (
          await Finding.create(
            [
              {
                auditId: audit._id,
                title: req.body.title,
                description: req.body.description,
                severity: req.body.severity || "medium",
                category: req.body.category || "quality",
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
exports.updateFinding = async (req, res, next) => {
  try {
    const data = await mutate(req, "finding", "updated", async (session) => {
      const f = await Finding.findById(req.params.id).session(session);
      const next = req.body.status;
      const allowed = {
        open: ["assigned", "in-progress"],
        assigned: ["in-progress"],
        "in-progress": ["resolved"],
        resolved: ["closed", "in-progress"],
        closed: [],
      };
      if (!allowed[f.status]?.includes(next))
        fail("Invalid finding transition.", 409);
      if (
        next === "closed" &&
        !["admin", "audit_manager"].includes(req.user.role)
      )
        fail("Audit manager must verify closure.");
      if (next === "resolved" && !String(req.body.resolution || "").trim())
        fail("Resolution evidence is required.", 400);
      f.status = next;
      if (req.body.resolution)
        f.evidence.push({ note: String(req.body.resolution).slice(0, 5000) });
      if (req.body.responsibleUser) {
        const u = await require("../models/user.model")
          .findOne({ _id: req.body.responsibleUser, isActive: true })
          .session(session);
        if (!u) fail("Active responsible user required", 400);
        f.responsibleUser = u._id;
      }
      await f.save({ session });
      return f;
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
