const router = require("express").Router();

const controller = require("../controllers/auditAssignment.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");

router.post(
  "/",
  ...authorize("audit.assignment", "create"),
  requireAuditParentAccess,
  controller.assignAudit
);

router.get(
  "/:auditId",
  ...authorize("audit.assignment", "read"),
  requireAuditParentAccess,
  controller.getAssignments
);

router.delete('/:id', ...authorize('audit.assignment','update'), async(req,res,next)=>{
  if(!require('mongoose').Types.ObjectId.isValid(req.params.id)) return res.status(400).json({message:'Invalid assignment id.'});
  const assignment=await require('../models/auditAssignment.model').findById(req.params.id).lean();
  if(!assignment)return res.status(404).json({message:'Assignment not found.'});
  req.auditScopeId=String(assignment.auditId);req.assignment=assignment;next();
},require('../middleware/auditScope.middleware').requireAuditAccess,async(req,res)=>{
  try{const data=await require('../services/auditTransaction.service').transaction(async session=>{
    const Profile=require('../models/auditorProfile.model');
    if(await Profile.exists({_id:req.assignment.auditor}).session(session)) await require('../services/auditorProfile.service').lockProfile(req.assignment.auditor,session);
    await require('../services/auditLifecycle.service').lockAudit(req.auditScopeId,session,req.user);
    const assignment=await require('../models/auditAssignment.model').findOneAndUpdate({_id:req.assignment._id},{$set:{status:'revoked'}},{returnDocument:'after',session});
    await require('../models/auditActivity.model').create([{auditId:req.auditScopeId,userId:req.user.id,action:'assignment-revoked',resource:'assignment'}],{session});return assignment;
  });res.json({success:true,data});}catch(error){res.status(error.status||500).json({message:error.status?error.message:'Assignment revocation failed.'});}
});
module.exports = router;
