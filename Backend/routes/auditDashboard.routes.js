const express = require("express");

const router = express.Router();

const {
  getAuditDashboard,
} = require("../controllers/auditDashboard.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("dashboard", "read"),
  require('../middleware/auditDirection.middleware').requireAuditDirection,
  getAuditDashboard
);

module.exports = router;
