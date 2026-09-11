const AuditActivity = require("../models/auditActivity.model");

const getOptionalModel = (name) => {
  try {
    return require(`../models/${name}.model`);
  } catch (error) {
    return null;
  }
};

const getAuditModel = () => {
  return getOptionalModel("audit");
};

const getUserModel = () => {
  return getOptionalModel("user");
};

const createAuditActivity = async ({
  auditId,
  userId = null,
  action,
  resource,
  description = "",
  metadata = {},
}) => {
  if (!auditId || !action || !resource) {
    return null;
  }

  try {
    return await AuditActivity.create({
      auditId,
      userId,
      action,
      resource,
      description,
      metadata,
    });
  } catch (error) {
    console.error("Audit activity creation error:", error.message);
    return null;
  }
};

const getAuditHistory = async (req, res) => {
  try {
    const { auditId } = req.params;

    if (!auditId) {
      return res.status(400).json({
        success: false,
        message: "auditId is required",
      });
    }

    const activities = await AuditActivity.find({ auditId })
      .sort({ createdAt: -1 })
      .lean();

    const User = getUserModel();

    if (User && activities.length > 0) {
      const userIds = activities
        .map((activity) => activity.userId)
        .filter(Boolean);

      if (userIds.length > 0) {
        const users = await User.find({
          _id: { $in: userIds },
        })
          .select("name firstName lastName email")
          .lean();

        const userMap = new Map(
          users.map((user) => [String(user._id), user])
        );

        activities.forEach((activity) => {
          if (activity.userId) {
            activity.user = userMap.get(String(activity.userId)) || null;
          } else {
            activity.user = null;
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Get audit history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit history",
      error: error.message,
    });
  }
};

const createActivity = async (req, res) => {
  try {
    const {
      auditId,
      userId,
      action,
      resource,
      description,
      metadata,
    } = req.body;

    if (!auditId || !action || !resource) {
      return res.status(400).json({
        success: false,
        message: "auditId, action and resource are required",
      });
    }

    const activity = await createAuditActivity({
      auditId,
      userId,
      action,
      resource,
      description,
      metadata,
    });

    if (!activity) {
      return res.status(500).json({
        success: false,
        message: "Failed to create audit activity",
      });
    }

    return res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Create audit activity error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create audit activity",
      error: error.message,
    });
  }
};

const getAuditTimeline = async (req, res) => {
  try {
    const { auditId } = req.params;

    if (!auditId) {
      return res.status(400).json({
        success: false,
        message: "auditId is required",
      });
    }

    const Audit = getAuditModel();

    if (Audit) {
      const audit = await Audit.findById(auditId).lean();

      if (!audit) {
        return res.status(404).json({
          success: false,
          message: "Audit not found",
        });
      }
    }

    const activities = await AuditActivity.find({ auditId })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Get audit timeline error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit timeline",
      error: error.message,
    });
  }
};

module.exports = {
  createAuditActivity,
  createActivity,
  getAuditHistory,
  getAuditTimeline,
};
