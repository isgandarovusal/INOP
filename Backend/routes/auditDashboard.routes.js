const express = require("express");

const router = express.Router();

const {
  getAuditDashboard,
} = require("../controllers/auditDashboard.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("audit.analytics", "read"),
  getAuditDashboard
);

module.exports = router;
