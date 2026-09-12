const router = require("express").Router();

const controller = require("../controllers/auditClosure.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.closure", "update"),
  requireAssignedAuditAccess,
  controller.closeAudit
);

router.get(
  "/:auditId",
  ...authorize("audit.closure", "read"),
  requireAssignedAuditAccess,
  controller.getClosure
);

module.exports = router;
