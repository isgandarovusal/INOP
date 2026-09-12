const router = require("express").Router();

const controller = require("../controllers/auditTimeline.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId",
  ...authorize("audit.timeline", "read"),
  requireAssignedAuditAccess,
  controller.getTimeline
);

module.exports = router;
