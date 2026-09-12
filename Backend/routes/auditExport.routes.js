const router = require("express").Router();

const controller = require("../controllers/auditExport.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAssignedAuditAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId/csv",
  ...authorize("audit.export", "read"),
  requireAssignedAuditAccess,
  controller.exportCsv
);

router.get(
  "/:auditId/excel",
  ...authorize("audit.export", "read"),
  requireAssignedAuditAccess,
  controller.exportExcel
);

router.get(
  "/:auditId/pdf",
  ...authorize("audit.export", "read"),
  requireAssignedAuditAccess,
  controller.exportPdf
);

module.exports = router;
