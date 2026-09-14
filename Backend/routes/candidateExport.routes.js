const router = require("express").Router();
const controller = require("../controllers/candidateExport.controller");
const { authorize } = require("../middleware/authorization.middleware");

router.get(
  "/csv",
  ...authorize("candidate", "read"),
  controller.exportCandidatesCsv
);

router.get(
  "/excel",
  ...authorize("candidate", "read"),
  controller.exportCandidatesExcel
);

router.get(
  "/:candidateId/pdf",
  ...authorize("candidate", "read"),
  ...authorize("application", "read"),
  controller.exportCandidatePdf
);

module.exports = router;
