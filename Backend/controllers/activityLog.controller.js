const mongoose = require("mongoose");
const ActivityLog = require("../models/activityLog.model");
const { listRecords, searchFilter } = require("../utils/listQuery");
const { sendError } = require("../utils/sendError");

function validObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.getActivityLogs = async (req, res) => {
  try {
    const query = { $and: [req.dataScope || {}, searchFilter(req.query || {}, ["userName", "description", "entityType"])] };
    const logs = await listRecords(ActivityLog, query, req, res);

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
    return sendError(res, error, "Fəaliyyət jurnalını yükləmək mümkün olmadı.");
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

    if (typeof action !== "string" || !action.trim() || action.length > 100 ||
        typeof entityType !== "string" || !entityType.trim() || entityType.length > 100 ||
        typeof description !== "string" || !description.trim() || description.length > 2000 ||
        typeof entityId !== "string" || entityId.length > 200) {
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
      departmentId: req.user.departmentId || "",
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
    console.error("Create activity log error:", error?.name || "Error");

    return res.status(500).json({
      message: "Fəaliyyəti qeydə almaq mümkün olmadı.",
    });
  }
};
