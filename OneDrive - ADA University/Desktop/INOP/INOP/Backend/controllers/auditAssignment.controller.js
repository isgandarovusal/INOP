const Assignment = require("../models/auditAssignment.model");
const User = require("../models/user.model");
const { mutate } = require("../services/auditMutation.service");
const { requireManager, fail } = require("../services/policy.service");
exports.assignAudit = async (req, res, next) => {
  try {
    requireManager(req);
    const user = await User.findOne({
      _id: req.body.auditor,
      isActive: true,
      role: { $in: ["auditor", "audit_manager"] },
    });
    if (!user) fail("Active auditor required", 400);
    const data = await mutate(req, "assignment", "created", async (session) =>
      Assignment.findOneAndUpdate(
        { auditId: req.audit._id, auditor: user._id },
        { $set: { assignedBy: req.user.id, status: "assigned" } },
        { upsert: true, new: true, runValidators: true, session },
      ),
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
exports.getAssignments = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Assignment.find({ auditId: req.audit._id }).sort({
        createdAt: -1,
      }),
    });
  } catch (e) {
    next(e);
  }
};
