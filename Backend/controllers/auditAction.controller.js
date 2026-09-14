const mongoose = require("mongoose");
const AuditAction = require("../models/auditAction.model");

const ALLOWED_STATUSES = new Set([
  "open",
  "in-progress",
  "completed",
  "verified",
  "rejected",
]);

exports.createAction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.auditId)) {
      return res.status(400).json({
        success: false,
        message: "Audit ID düzgün deyil.",
      });
    }

    if (!String(req.body.title || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Action title tələb olunur.",
      });
    }

    const action = await AuditAction.create({
      auditId: req.body.auditId,
      executionId: req.body.executionId || null,
      title: String(req.body.title).trim(),
      description: String(req.body.description || "").trim(),
      priority: req.body.priority || "medium",
      responsible: String(req.body.responsible || "").trim(),
      dueDate: req.body.dueDate || null,
      status: req.body.status || "open",
    });

    return res.status(201).json({
      success: true,
      data: action,
    });
  } catch (error) {
    console.error("Audit action create error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Action məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Action create error",
    });
  }
};

exports.getActions = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.auditId)) {
      return res.status(400).json({
        success: false,
        message: "Audit ID düzgün deyil.",
      });
    }

    const actions = await AuditAction.find({
      auditId: req.params.auditId,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: actions,
    });
  } catch (error) {
    console.error("Audit actions get error:", error);
    return res.status(500).json({
      success: false,
      message: "Actions alınarkən server xətası baş verdi.",
    });
  }
};

exports.updateActionStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Action ID düzgün deyil.",
      });
    }

    const status = String(req.body.status || "").trim();

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: "Action status düzgün deyil.",
      });
    }

    const update = { status };

    if (status === "completed") {
      update.completedAt = new Date();
    }

    if (status === "verified") {
      update.verifiedBy = req.user?.id || "";
      update.verificationNote = String(
        req.body.verificationNote || ""
      ).trim();
    }

    const action = await AuditAction.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!action) {
      return res.status(404).json({
        success: false,
        message: "Action tapılmadı.",
      });
    }

    return res.json({
      success: true,
      data: action,
    });
  } catch (error) {
    console.error("Audit action update error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Action məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Action update error",
    });
  }
};
