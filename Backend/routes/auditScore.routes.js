const express = require("express");
const router = express.Router();

const {
  calculateScore,
} = require("../controllers/auditScore.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/:id/calculate",
  ...authorize("audit.score", "update"),
  requireAssignedAuditAccess,
  calculateScore
);

module.exports = router;
