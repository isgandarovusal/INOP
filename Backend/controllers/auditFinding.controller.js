const AuditFinding = require("../models/auditFinding.model");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");
const { createAuditActivity } = require("./auditActivity.controller");

exports.getFindings = async (req, res) => {
  try {
    const auditId = req.params.auditId;

    const audit = await findAuditByIdentifier(auditId);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (req.permission?.scope === "assigned") {
      const allowed = await userHasAuditAccess(req, auditId);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Bu Audit-in finding-lərinə giriş icazəniz yoxdur.",
        });
      }
    }

    const data = await AuditFinding.find({
      auditId: audit._id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get findings error:", error);

    return res.status(500).json({
      success: false,
      message: "Finding error",
    });
  }
};

exports.createFinding = async (req, res) => {
  try {
    const auditId = req.body.auditId;

    const audit = await findAuditByIdentifier(auditId);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (req.permission?.scope === "assigned") {
      const allowed = await userHasAuditAccess(req, auditId);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Bu Audit-ə finding əlavə etmək icazəniz yoxdur.",
        });
      }
    }

    const finding = await AuditFinding.create({
      auditId: audit._id,
      executionId: req.body.executionId || undefined,
      title: req.body.title,
      description: req.body.description || "",
      severity: req.body.severity || "medium",
      category: req.body.category || "quality",
      dueDate: req.body.dueDate || undefined,
    });

    await createAuditActivity({
      auditId: audit._id,
      action: "created",
      resource: "finding",
      description: `Finding yaradıldı: ${finding.title}`,
      metadata: {
        findingId: finding._id,
        severity: finding.severity,
        category: finding.category,
        status: finding.status,
        createdBy: req.user?.id || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: finding,
    });
  } catch (error) {
    console.error("Create finding error:", error);

    return res.status(500).json({
      success: false,
      message: "Finding creation error",
    });
  }
};
