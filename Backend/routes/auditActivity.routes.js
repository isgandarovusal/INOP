const express = require("express");

const {
  createActivity,
  getAuditHistory,
  getAuditTimeline,
} = require("../controllers/auditActivity.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

const router = express.Router();

router.post(
  "/",
  ...authorize("audit.activity", "read"),
  requireAssignedAuditAccess,
  createActivity
);

router.get(
  "/:auditId/timeline",
  ...authorize("audit.activity", "read"),
  requireAssignedAuditAccess,
  getAuditTimeline
);

router.get(
  "/:auditId",
  ...authorize("audit.activity", "read"),
  requireAssignedAuditAccess,
  getAuditHistory
);

module.exports = router;
