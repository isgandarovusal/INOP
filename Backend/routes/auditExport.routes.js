const router = require("express").Router();

const controller = require("../controllers/auditExport.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId/csv",
  ...authorize("audit.export", "read"),
  requireAuditParentAccess,
  controller.exportCsv
);

router.get(
  "/:auditId/excel",
  ...authorize("audit.export", "read"),
  requireAuditParentAccess,
  controller.exportExcel
);

router.get(
  "/:auditId/pdf",
  ...authorize("audit.export", "read"),
  requireAuditParentAccess,
  controller.exportPdf
);

module.exports = router;
