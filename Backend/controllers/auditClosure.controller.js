const Audit =
  require("../models/audit.model");

const AuditFinding =
  require("../models/auditFinding.model");

const AuditApproval =
  require("../models/auditApproval.model");

const AuditClosure =
  require("../models/auditClosure.model");

const {
  createAuditActivity,
} = require("./auditActivity.controller");


// CLOSE AUDIT
exports.closeAudit = async (req, res) => {
  try {
    const {
      auditId,
      executionId,
      comment,
    } = req.body;

    const audit =
      await Audit.findById(auditId);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    const openFindings =
      await AuditFinding.countDocuments({
        auditId,
        status: {
          $ne: "closed",
        },
      });

    if (openFindings > 0) {
      return res.status(400).json({
        success: false,
        message: "Open findings exist",
      });
    }

    const approval =
      await AuditApproval.findOne({
        auditId,
      }).sort({
        createdAt: -1,
      });

    if (
      approval &&
      approval.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message: "Approval required",
      });
    }

    const closure =
      await AuditClosure.create({
        auditId,
        executionId,
        approvalStatus:
          approval?.status || "approved",
        comment,
        closedBy: req.user?.id || null,
      });

    audit.status = "completed";

    await audit.save();

    await createAuditActivity({
      auditId: audit._id,
      action: "closed",
      resource: "closure",
      description: "Audit bağlandı",
      metadata: {
        closureId: closure._id,
        approvalStatus: closure.approvalStatus,
        finalStatus: closure.finalStatus,
        comment: closure.comment,
      },
    });

    return res.status(201).json({
      success: true,
      data: closure,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET CLOSURE
exports.getClosure = async (req, res) => {
  try {
    const data =
      await AuditClosure.find({
        auditId: req.params.auditId,
      })
      .sort({
        createdAt: -1,
      });

    return res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
