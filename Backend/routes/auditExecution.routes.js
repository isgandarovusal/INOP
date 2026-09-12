const express = require("express");
const router = express.Router();

const {
  createExecution,
  getExecution,
  submitExecution,
} = require("../controllers/auditExecution.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.execution", "create"),
  requireAssignedAuditAccess,
  createExecution
);

router.get(
  "/:id",
  ...authorize("audit.execution", "read"),
  requireAssignedAuditAccess,
  getExecution
);

router.put(
  "/:id/submit",
  ...authorize("audit.execution", "update"),
  requireAssignedAuditAccess,
  submitExecution
);

module.exports = router;
