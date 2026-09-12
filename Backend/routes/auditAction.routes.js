const express = require("express");
const router = express.Router();

const {
  createAction,
  getActions,
  updateActionStatus,
} = require("../controllers/auditAction.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.action", "create"),
  requireAssignedAuditAccess,
  createAction
);

router.get(
  "/audit/:auditId",
  ...authorize("audit.action", "read"),
  requireAssignedAuditAccess,
  getActions
);

router.put(
  "/:id/status",
  ...authorize("audit.action", "update"),
  requireAssignedAuditAccess,
  updateActionStatus
);

module.exports = router;
