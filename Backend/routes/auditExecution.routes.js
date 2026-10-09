const express = require("express");
const router = express.Router();

const {
  createExecution,
  listExecutions,
  getExecution,
  submitExecution,
} = require("../controllers/auditExecution.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");
const { requireExecutionAccess } = require('../middleware/auditExecutionScope.middleware');

router.get('/', ...authorize('audit.execution', 'read'), listExecutions);

router.post(
  "/",
  ...authorize("audit.execution", "create"),
  requireAuditParentAccess,
  createExecution
);

router.get(
  "/:id",
  ...authorize("audit.execution", "read"),
  requireExecutionAccess,
  getExecution
);

router.put(
  "/:id/submit",
  ...authorize("audit.execution", "update"),
  requireExecutionAccess,
  submitExecution
);

module.exports = router;
