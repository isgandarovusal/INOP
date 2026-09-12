const express = require("express");
const router = express.Router();

const {
  getSafetyDetails,
  updateSafetyDetails,
} = require("../controllers/occupationalSafetyDetails.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:id/details",
  ...authorize("occupational_safety_details", "read"),
  requireAssignedAuditAccess,
  getSafetyDetails
);

router.patch(
  "/:id/details",
  ...authorize("occupational_safety_details", "update"),
  requireAssignedAuditAccess,
  updateSafetyDetails
);

module.exports = router;
