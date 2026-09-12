const AuditNotification = require("../models/auditNotification.model");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await AuditNotification.find({
      userId: req.user.id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Notification retrieval error",
    });
  }
};

exports.createNotification = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const auditId = req.body.auditId;
    const targetUserId = req.body.userId;

    if (!auditId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "auditId və userId tələb olunur",
      });
    }

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
          message:
            "Bu Audit üzrə notification yaratmaq icazəniz yoxdur.",
        });
      }

      if (String(targetUserId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message:
            "Assigned scope daxilində yalnız öz istifadəçiniz üçün notification yarada bilərsiniz.",
        });
      }
    }

    const notification = await AuditNotification.create({
      auditId: audit._id,
      userId: targetUserId,
      type: req.body.type,
      title: req.body.title,
      message: req.body.message,
      read: false,
    });

    return res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Notification creation error",
    });
  }
};

exports.markRead = async (req, res) => {
  try {
    const notification = await AuditNotification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      {
        read: true,
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Notification update error",
    });
  }
};
