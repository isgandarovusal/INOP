const express = require("express");
const router = express.Router();

const controller = require("../controllers/auditNotification.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("audit.notification", "read"),
  controller.getNotifications
);

router.post(
  "/",
  ...authorize("audit.notification", "create"),
  controller.createNotification
);

router.patch(
  "/:id/read",
  ...authorize("audit.notification", "update"),
  controller.markRead
);

module.exports = router;
