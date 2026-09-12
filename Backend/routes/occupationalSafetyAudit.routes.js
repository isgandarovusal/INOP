const express = require("express");
const router = express.Router();

const {
  getOccupationalSafetyAudits,
  createOccupationalSafetyAudit,
} = require("../controllers/occupationalSafetyAudit.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/",
  ...authorize("occupational_safety_audit", "read"),
  getOccupationalSafetyAudits
);

router.post(
  "/",
  ...authorize("occupational_safety_audit", "create"),
  createOccupationalSafetyAudit
);

module.exports = router;
