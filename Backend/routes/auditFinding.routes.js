const router = require("express").Router();

const controller = require("../controllers/auditFinding.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId",
  ...authorize("audit.finding", "read"),
  requireAuditParentAccess,
  controller.getFindings
);

router.post(
  "/",
  ...authorize("audit.finding", "create"),
  requireAuditParentAccess,
  controller.createFinding
);

module.exports = router;
