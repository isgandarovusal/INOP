const mongoose = require("mongoose");
const ActivityLog = require("../models/activityLog.model");

function validObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.getActivityLogs = async (req, res) => {
  try {
    const query = {};

    if (
      req.dataScope &&
      Object.keys(req.dataScope).length > 0
    ) {
      Object.assign(query, req.dataScope);
    }

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return res.status(200).json({
      activityLogs: logs.map((log) => ({
        id: String(log._id),
        userId: log.userId ? String(log.userId) : "",
        userName: log.userName,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get activity logs error:", error);

    return res.status(500).json({
      message: "Fəaliyyət jurnalını yükləmək mümkün olmadı.",
    });
  }
};

exports.createActivityLog = async (req, res) => {
  try {
    const {
      action,
      entityType,
      entityId = "",
      description,
    } = req.body;

    if (!action || !entityType || !description) {
      return res.status(400).json({
        message:
          "action, entityType və description tələb olunur.",
      });
    }

    const activityLog = await ActivityLog.create({
      userId: validObjectId(req.user.id)
        ? req.user.id
        : null,
      userName: req.user.name || "",
      action: String(action).trim().toLowerCase(),
      entityType: String(entityType).trim(),
      entityId: String(entityId || "").trim(),
      description: String(description).trim(),
    });

    return res.status(201).json({
      message: "Fəaliyyət qeydə alındı.",
      activityLog: {
        id: String(activityLog._id),
        userId: activityLog.userId
          ? String(activityLog.userId)
          : "",
        userName: activityLog.userName,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityId: activityLog.entityId,
        description: activityLog.description,
        createdAt: activityLog.createdAt,
      },
    });
  } catch (error) {
    console.error("Create activity log error:", error);

    return res.status(500).json({
      message: "Fəaliyyəti qeydə almaq mümkün olmadı.",
    });
  }
};
