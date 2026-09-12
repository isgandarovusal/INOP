const express = require("express");
const router = express.Router();

const {
  getOccupationalSafetyAudits,
  createOccupationalSafetyAudit,
} = require("../controllers/occupationalSafetyAudit.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/",
  ...authorize("occupational_safety_audit", "read"),
  getOccupationalSafetyAudits
);

router.post(
  "/",
  ...authorize("occupational_safety_audit", "create"),
  requireAssignedAuditAccess,
  createOccupationalSafetyAudit
);

module.exports = router;
