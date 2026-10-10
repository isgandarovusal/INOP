const { withAuditMutation } = require("../services/auditMutation.service");
const { withAuditLibraryMutation } = require("../services/auditLibraryMutation.service");
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
  withAuditMutation(withAuditLibraryMutation(createExecution))
);

router.get(
  "/:id",
  ...authorize("audit.execution", "read"),
  requireAssignedAuditAccess,
  getExecution
);

router.route("/:id/submit").put(

  ...authorize("audit.execution", "update"),
  requireAssignedAuditAccess,
  withAuditMutation(submitExecution)
).patch(
  ...authorize("audit.execution", "update"),
  requireAssignedAuditAccess,
  withAuditMutation(submitExecution)
);

module.exports = router;
