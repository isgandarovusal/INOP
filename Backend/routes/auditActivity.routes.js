const express = require("express");

const {
  createActivity,
  getAuditHistory,
  getAuditTimeline,
} = require("../controllers/auditActivity.controller");

const router = express.Router();

router.post("/", createActivity);

router.get("/:auditId/timeline", getAuditTimeline);

router.get("/:auditId", getAuditHistory);

module.exports = router;
