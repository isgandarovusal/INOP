const mongoose = require("mongoose");

const AuditNotification = require("../models/auditNotification.model");
const User = require("../models/user.model");
const { sendEmail } = require("./email.service");

async function notifyUser({
  auditId,
  userId,
  type,
  title,
  message,
}) {
  if (!auditId || !userId) {
    return {
      created: false,
      email: {
        sent: false,
        skipped: true,
      },
      reason: "auditId and userId are required.",
    };
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      created: false,
      email: {
        sent: false,
        skipped: true,
      },
      reason: "Invalid notification recipient.",
    };
  }

  const recipient = await User.findOne({
    _id: userId,
    isActive: true,
  })
    .select("_id email")
    .lean();

  if (!recipient) {
    return {
      created: false,
      email: {
        sent: false,
        skipped: true,
      },
      reason: "Notification recipient not found.",
    };
  }

  const notification = await AuditNotification.create({
    auditId,
    userId: recipient._id,
    type,
    title,
    message,
    read: false,
  });

  let emailResult = {
    sent: false,
    skipped: true,
  };

  if (recipient.email) {
    try {
      emailResult = await sendEmail({
        to: recipient.email,
        title,
        message,
      });
    } catch (error) {
      console.error(
        "Notification email delivery failed:",
        error.message
      );

      emailResult = {
        sent: false,
        skipped: false,
      };
    }
  }

  return {
    created: true,
    notification,
    email: {
      sent: Boolean(emailResult.sent),
      skipped: Boolean(emailResult.skipped),
    },
  };
}

module.exports = {
  notifyUser,
};
