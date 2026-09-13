const express = require("express");

const router = express.Router();

const activityLogController = require("../controllers/activityLog.controller");
const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("activity_log", "read"),
  activityLogController.getActivityLogs
);

router.post(
  "/",
  ...authorize("activity_log", "create"),
  activityLogController.createActivityLog
);

module.exports = router;
