const router = require("express").Router();

const controller = require("../controllers/auditTimeline.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId",
  ...authorize("audit.timeline", "read"),
  requireAuditParentAccess,
  controller.getTimeline
);

module.exports = router;
