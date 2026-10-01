const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const Closure = require("../models/auditClosure.model");
const Approval = require("../models/auditApproval.model");
const Finding = require("../models/auditFinding.model");
const Action = require("../models/auditAction.model");
const Execution = require("../models/auditExecution.model");
const Activity = require("../models/auditActivity.model");
const { fail } = require("../services/policy.service");
exports.closeAudit = async (req, res, next) => {
  try {
    let data;
    await mongoose.connection.transaction(async (session) => {
      const audit = await Audit.findById(req.audit._id).session(session);
      const prior = await Closure.findOne({ auditId: audit._id }).session(
        session,
      );
      if (prior) {
        data = prior;
        return;
      }
      if (audit.status !== "in-progress")
        fail("Audit must be in progress.", 409);
      // Write lock serializes closure with every mutation of this audit.
      await Audit.updateOne(
        { _id: audit._id },
        { $inc: { revision: 1 } },
        { session },
      );
      if (
        await Finding.exists({
          auditId: audit._id,
          status: { $ne: "closed" },
        }).session(session)
      )
        fail("Close all findings first.", 409);
      if (
        await Action.exists({
          auditId: audit._id,
          status: { $ne: "verified" },
        }).session(session)
      )
        fail("Verify all actions first.", 409);
      const execution = await Execution.findOne({
        auditId: audit._id,
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .session(session);
      if (!execution) fail("Completed execution required.", 409);
      if (
        req.body.executionId &&
        String(execution._id) !== req.body.executionId
      )
        fail("Execution does not match this audit.", 400);
      const approval = await Approval.findOne({ auditId: audit._id })
        .sort({ createdAt: -1 })
        .session(session);
      if (
        !approval ||
        approval.status !== "approved" ||
        approval.reviewRevision !== audit.revision
      )
        fail("Fresh independent approval required after the last change.", 409);
      data = (
        await Closure.create(
          [
            {
              auditId: audit._id,
              executionId: execution._id,
              approvalStatus: "approved",
              closedBy: req.user.id,
              comment: String(req.body.comment || "").slice(0, 5000),
            },
          ],
          { session },
        )
      )[0];
      await Audit.updateOne(
        { _id: audit._id },
        {
          $set: {
            status: "completed",
            overallPercentage: execution.totalScore,
          },
        },
        { session },
      );
      await Activity.create(
        [
          {
            auditId: audit._id,
            userId: req.user.id,
            action: "closed",
            resource: "closure",
            description: "Audit completed after independent approval",
          },
        ],
        { session },
      );
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
exports.getClosure = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Closure.find({ auditId: req.audit._id }),
    });
  } catch (e) {
    next(e);
  }
};
