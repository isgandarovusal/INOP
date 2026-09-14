const mongoose = require("mongoose");
const AuditExecution = require("../models/auditExecution.model");

function calculateRisk(score) {
  if (score >= 90) return "low";
  if (score >= 70) return "medium";
  if (score >= 50) return "high";
  return "critical";
}

exports.createExecution = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.body.auditId)) {
      return res.status(400).json({
        success: false,
        message: "Audit ID düzgün deyil.",
      });
    }

    const execution = await AuditExecution.create({
      auditId: req.body.auditId,
      checklistId: req.body.checklistId || null,
      answers: Array.isArray(req.body.answers) ? req.body.answers : [],
      findings: Array.isArray(req.body.findings) ? req.body.findings : [],
      correctiveActions: Array.isArray(req.body.correctiveActions)
        ? req.body.correctiveActions
        : [],
      status: req.body.status || "draft",
      createdBy: req.user?.id || "",
    });

    return res.status(201).json({
      success: true,
      data: execution,
    });
  } catch (error) {
    console.error("Audit execution create error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Audit execution məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Audit execution error",
    });
  }
};

exports.getExecution = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Execution ID düzgün deyil.",
      });
    }

    const item = await AuditExecution.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Audit execution tapılmadı.",
      });
    }

    return res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Audit execution get error:", error);
    return res.status(500).json({
      success: false,
      message: "Audit execution alınarkən server xətası baş verdi.",
    });
  }
};

exports.submitExecution = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Execution ID düzgün deyil.",
      });
    }

    if (!Array.isArray(req.body.answers)) {
      return res.status(400).json({
        success: false,
        message: "answers array formatında olmalıdır.",
      });
    }

    const answers = req.body.answers;
    const score = answers.reduce((sum, answer) => {
      const value = Number(answer?.score || 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const risk = calculateRisk(score);

    const updated = await AuditExecution.findByIdAndUpdate(
      req.params.id,
      {
        answers,
        totalScore: score,
        riskLevel: risk,
        status: "completed",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Audit execution tapılmadı.",
      });
    }

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Audit execution submit error:", error);

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Execution məlumatları düzgün deyil.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Submit error",
    });
  }
};

module.exports.calculateRisk = calculateRisk;
