const AuditTimeline = require("../models/auditActivity.model");

exports.getTimeline = async (req, res) => {
  try {
    const data = await AuditTimeline.find({
      auditId: req.params.auditId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
    });
  }
};
