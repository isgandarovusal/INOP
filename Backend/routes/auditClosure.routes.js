const router = require("express").Router();

const controller = require("../controllers/auditClosure.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.closure", "update"),
  requireAuditParentAccess,
  controller.closeAudit
);

router.get(
  "/:auditId",
  ...authorize("audit.closure", "read"),
  requireAuditParentAccess,
  controller.getClosure
);

module.exports = router;
