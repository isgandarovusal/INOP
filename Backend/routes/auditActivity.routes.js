const express = require("express");

const {
  createActivity,
  getAuditHistory,
  getAuditTimeline,
} = require("../controllers/auditActivity.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

const router = express.Router();

router.post(
  "/",
  ...authorize("audit.activity", "read"),
  requireAuditParentAccess,
  createActivity
);

router.get(
  "/:auditId/timeline",
  ...authorize("audit.activity", "read"),
  requireAuditParentAccess,
  getAuditTimeline
);

router.get(
  "/:auditId",
  ...authorize("audit.activity", "read"),
  requireAuditParentAccess,
  getAuditHistory
);

module.exports = router;
