const express = require("express");

const router = express.Router();

const activityLogController = require("../controllers/activityLog.controller");
const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("activity_log", "read"),
  activityLogController.getActivityLogs,
);

module.exports = router;
