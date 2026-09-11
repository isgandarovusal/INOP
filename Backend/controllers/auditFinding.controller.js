const AuditFinding = require("../models/auditFinding.model");
const { createAuditActivity } = require("./auditActivity.controller");

exports.getFindings = async (req, res) => {
  try {
    const data = await AuditFinding.find({
      auditId: req.params.auditId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      success: false,
      message: "Finding error",
    });
  }
};

exports.createFinding = async (req, res) => {
  try {
    const finding = await AuditFinding.create({
      auditId: req.body.auditId,
      executionId: req.body.executionId,
      title: req.body.title,
      description: req.body.description,
      severity: req.body.severity,
      category: req.body.category,
      dueDate: req.body.dueDate,
    });

    await createAuditActivity({
      auditId: finding.auditId,
      action: "created",
      resource: "finding",
      description: `Finding yaradıldı: ${finding.title}`,
      metadata: {
        findingId: finding._id,
        severity: finding.severity,
        category: finding.category,
        status: finding.status,
      },
    });

    res.status(201).json({
      success: true,
      data: finding,
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      success: false,
      message: "Finding creation error",
    });
  }
};
