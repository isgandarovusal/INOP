const router = require("express").Router();

const controller = require("../controllers/auditAssignment.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.assignment", "create"),
  requireAuditParentAccess,
  controller.assignAudit
);

router.get(
  "/:auditId",
  ...authorize("audit.assignment", "read"),
  requireAuditParentAccess,
  controller.getAssignments
);

module.exports = router;
