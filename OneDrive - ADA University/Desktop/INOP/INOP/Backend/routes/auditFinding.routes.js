const router = require("express").Router();

const controller = require("../controllers/auditFinding.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId",
  ...authorize("audit.finding", "read"),
  requireAssignedAuditAccess,
  controller.getFindings,
);

router.post(
  "/",
  ...authorize("audit.finding", "create"),
  requireAssignedAuditAccess,
  controller.createFinding,
);

router.patch(
  "/:id",
  ...authorize("audit.finding", "update"),
  requireAssignedAuditAccess,
  controller.updateFinding,
);
module.exports = router;
