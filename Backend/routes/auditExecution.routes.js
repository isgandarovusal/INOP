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
  requireAssignedResourceAuditAccess,
} = require("../middleware/auditScope.middleware");
const AuditExecution = require("../models/auditExecution.model");

router.post(
  "/",
  ...authorize("audit.execution", "create"),
  requireAssignedAuditAccess,
  createExecution
);

router.get(
  "/:id",
  ...authorize("audit.execution", "read"),
  requireAssignedResourceAuditAccess(AuditExecution),
  getExecution
);

const submitMiddleware = [
  ...authorize("audit.execution", "update"),
  requireAssignedResourceAuditAccess(AuditExecution),
  submitExecution,
];

// PUT is the canonical API. PATCH is retained for compatibility with the
// existing frontend client and behaves identically.
router.put("/:id/submit", ...submitMiddleware);
router.patch("/:id/submit", ...submitMiddleware);

module.exports = router;
