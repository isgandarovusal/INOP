const express = require("express");
const router = express.Router();

const {
  getAuditReport,
} = require("../controllers/auditReport.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:id",
  ...authorize("audit.report", "read"),
  requireAuditParentAccess,
  getAuditReport
);

module.exports = router;
