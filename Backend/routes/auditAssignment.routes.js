const router = require("express").Router();

const controller = require("../controllers/auditAssignment.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.assignment", "create"),
  requireAssignedAuditAccess,
  controller.assignAudit
);

router.get(
  "/:auditId",
  ...authorize("audit.assignment", "read"),
  requireAssignedAuditAccess,
  controller.getAssignments
);

module.exports = router;
