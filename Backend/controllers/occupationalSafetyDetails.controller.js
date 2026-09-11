const Audit = require("../models/audit.model");

exports.getSafetyDetails = async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    res.json({
      success: true,
      data: audit.safetyDetails || {
        riskLevel: "low",
        violations: [],
        correctiveAction: "",
        responsiblePerson: "",
        deadline: null,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Safety details error",
    });
  }
};

exports.updateSafetyDetails = async (req, res) => {
  try {
    const audit = await Audit.findByIdAndUpdate(
      req.params.id,
      {
        safetyDetails: {
          riskLevel: req.body.riskLevel || "low",
          violations: Array.isArray(req.body.violations)
            ? req.body.violations
            : [],
          correctiveAction: req.body.correctiveAction || "",
          responsiblePerson: req.body.responsiblePerson || "",
          deadline: req.body.deadline || null,
        },
      },
      {
        new: true,
      }
    );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    res.json({
      success: true,
      data: audit.safetyDetails,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Safety details error",
    });
  }
};
