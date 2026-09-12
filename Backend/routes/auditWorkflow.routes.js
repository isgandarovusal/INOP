const express = require("express");
const router = express.Router();

const {
  updateAuditStatus,
} = require("../controllers/auditWorkflow.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.patch(
  "/:id/status",
  ...authorize("audit.workflow", "update"),
  requireAssignedAuditAccess,
  updateAuditStatus
);

module.exports = router;
