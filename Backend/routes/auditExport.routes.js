const router =
  require("express").Router();

const controller =
  require("../controllers/auditExport.controller");


router.get(
  "/:auditId/csv",
  controller.exportCsv
);


router.get(
  "/:auditId/excel",
  controller.exportExcel
);


router.get(
  "/:auditId/pdf",
  controller.exportPdf
);


module.exports = router;
