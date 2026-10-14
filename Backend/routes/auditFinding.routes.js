const router = require("express").Router();

const controller = require("../controllers/auditFinding.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.get(
  "/:auditId",
  ...authorize("audit.finding", "read"),
  requireAuditParentAccess,
  controller.getFindings
);

router.post(
  "/",
  ...authorize("audit.finding", "create"),
  requireAuditParentAccess,
  controller.createFinding
);

router.patch('/:id/status', ...authorize('audit.finding','update'), async(req,res,next)=>{
  if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) return res.status(400).json({message:'Invalid finding id.'});
  const finding=await require('../models/auditFinding.model').findById(req.params.id).select('auditId').lean();
  if (!finding) return res.status(404).json({message:'Finding not found.'});
  req.auditScopeId=String(finding.auditId);next();
}, require('../middleware/auditScope.middleware').requireAuditAccess, async(req,res)=>{
  try{res.json({success:true,data:await require('../services/auditLifecycle.service').setFindingStatus(req)});}catch(error){res.status(error.status||500).json({message:error.status?error.message:'Finding update failed.'});}
});
module.exports = router;
