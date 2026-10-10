const { withAuditMutation } = require("../services/auditMutation.service");
const router = require("express").Router();

const controller = require("../controllers/auditApproval.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.approval", "create"),
  requireAssignedAuditAccess,
  withAuditMutation(controller.createApproval)
);

router.get(
  "/:auditId",
  ...authorize("audit.approval", "read"),
  requireAssignedAuditAccess,
  controller.getApprovals
);

router.patch(
  "/:id",
  ...authorize("audit.approval", "update"),
  requireAssignedAuditAccess,
  withAuditMutation(controller.updateApproval)
);

module.exports = router;
