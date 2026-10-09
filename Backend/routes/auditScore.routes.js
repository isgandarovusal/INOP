const express = require("express");
const router = express.Router();

const {
  calculateScore,
} = require("../controllers/auditScore.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/:id/calculate",
  ...authorize("audit.score", "update"),
  requireAuditParentAccess,
  calculateScore
);

module.exports = router;
