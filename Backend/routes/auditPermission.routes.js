const express = require("express");
const router = express.Router();

const {
  checkAuditAccess,
} = require("../controllers/auditPermission.controller");

const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/check",
  ...authorize("audit.permission", "read"),
  checkAuditAccess
);

module.exports = router;
