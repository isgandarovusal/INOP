const express = require("express");
const router = express.Router();

const {
  getStandardAudits,
  getServiceAudits,
} = require("../controllers/auditModule.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/standard",
  ...authorize("audit", "read"),
  getStandardAudits
);

router.get(
  "/service",
  ...authorize("audit", "read"),
  getServiceAudits
);

module.exports = router;
