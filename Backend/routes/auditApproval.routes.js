const router = require("express").Router();

const controller = require("../controllers/auditApproval.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.approval", "create"),
  requireAuditAccess,
  controller.createApproval
);

router.get(
  "/:auditId",
  ...authorize("audit.approval", "read"),
  requireAuditAccess,
  controller.getApprovals
);

router.patch(
  "/:id",
  ...authorize("audit.approval", "update"),
  controller.resolveApprovalParent,
  requireAuditAccess,
  controller.updateApproval
);

router.get('/:auditId/reviewers', ...authorize('audit.approval','read'), requireAuditAccess, async(req,res)=>res.json({success:true,data:await require('../services/auditPeople.service').reviewerCandidates(req)}));
module.exports = router;
