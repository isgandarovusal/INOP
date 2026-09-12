const express = require("express");
const router = express.Router();

const {
  getAuditReport,
} = require("../controllers/auditReport.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:id",
  ...authorize("audit.report", "read"),
  requireAssignedAuditAccess,
  getAuditReport
);

module.exports = router;
