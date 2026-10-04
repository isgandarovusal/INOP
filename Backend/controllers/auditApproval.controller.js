const Approval = require("../models/auditApproval.model");
const User = require("../models/user.model");
const Execution = require("../models/auditExecution.model");
const { mutate } = require("../services/auditMutation.service");
const { fail } = require("../services/policy.service");
exports.createApproval = async (req, res, next) => {
  try {
    const reviewer = await User.findOne({
      _id: req.body.reviewer,
      isActive: true,
      role: { $in: ["admin", "audit_manager", "manager"] },
    });
    if (
      !reviewer ||
      String(reviewer._id) === req.user.id ||
      String(reviewer._id) === String(req.audit.auditorId)
    )
      fail("An independent manager reviewer is required.", 400);
    const data = await mutate(
      req,
      "approval",
      "created",
      async (session, audit) => {
        if (
          !(await Execution.exists({
            auditId: audit._id,
            status: "completed",
          }).session(session))
        )
          fail("Complete an execution before requesting approval.", 409);
        if (
          await Approval.exists({
            auditId: audit._id,
            status: "pending",
          }).session(session)
        )
          fail("An approval request is already pending.", 409);
        return (
          await Approval.create(
            [
              {
                auditId: audit._id,
                requestedBy: req.user.id,
                reviewer: reviewer._id,
                status: "pending",
              },
            ],
            { session },
          )
        )[0];
      },
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
exports.getApprovals = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Approval.find({ auditId: req.audit._id }).sort({
        createdAt: -1,
      }),
    });
  } catch (e) {
    next(e);
  }
};
exports.updateApproval = async (req, res, next) => {
  try {
    if (!["approved", "rejected"].includes(req.body.status))
      fail("Decision must be approved or rejected.", 400);
    const data = await mutate(
      req,
      "approval",
      "updated",
      async (session, audit) => {
        const a = await Approval.findById(req.params.id).session(session);
        if (!a || a.status !== "pending") fail("No pending approval.", 409);
        if (
          String(a.reviewer) !== req.user.id ||
          String(a.requestedBy) === req.user.id ||
          String(audit.auditorId) === req.user.id
        )
          fail("Only the independent designated reviewer can decide.");
        a.status = req.body.status;
        a.comment = String(req.body.comment || "").slice(0, 5000);
        a.decidedBy = req.user.id;
        a.approvedAt = a.status === "approved" ? new Date() : null;
        a.reviewRevision = audit.revision;
        await a.save({ session });
        return a;
      },
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
