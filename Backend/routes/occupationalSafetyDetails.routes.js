const express = require("express");
const router = express.Router();

const {
  getSafetyDetails,
  updateSafetyDetails,
} = require("../controllers/occupationalSafetyDetails.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:id/details",
  ...authorize("occupational_safety_details", "read"),
  requireAuditParentAccess,
  getSafetyDetails
);

router.patch(
  "/:id/details",
  ...authorize("occupational_safety_details", "update"),
  requireAuditParentAccess,
  updateSafetyDetails
);

module.exports = router;
