const express = require("express");

const router = express.Router();

const {
  getAuditDashboard,
} = require("../controllers/auditDashboard.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("dashboard", "read"),
  getAuditDashboard
);

module.exports = router;
