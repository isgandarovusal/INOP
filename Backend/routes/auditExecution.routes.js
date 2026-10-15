const express = require("express");
const router = express.Router();

const {
  createExecution,
  listExecutions,
  getExecution,
  submitExecution,
} = require("../controllers/auditExecution.controller");

const { authorize } = require("../middleware/authorization.middleware");
const {
  requireAuditParentAccess,
} = require("../middleware/auditScope.middleware");
const { requireExecutionAccess } = require('../middleware/auditExecutionScope.middleware');
const { requireExecutionTemplateAccess } = require('../middleware/templateScope.middleware');

router.get('/', ...authorize('audit.execution', 'read'), listExecutions);

router.post(
  "/",
  ...authorize("audit.execution", "create"),
  requireAuditParentAccess,
  requireExecutionTemplateAccess,
  createExecution
);

router.get(
  "/:id",
  ...authorize("audit.execution", "read"),
  requireExecutionAccess,
  getExecution
);

router.put(
  "/:id/submit",
  ...authorize("audit.execution", "update"),
  requireExecutionAccess,
  submitExecution
);

router.put('/:id/draft', ...authorize('audit.execution','update'), requireExecutionAccess, async(req,res)=>{
  try {res.json({success:true,data:await require('../services/hrAuditExecution.service').save(req,false)});}
  catch(error){res.status(error.status||500).json({message:error.status?error.message:'HR draft save failed.'});}
});

module.exports = router;

router.get('/:id/hr-history', ...authorize('audit.execution','read'), requireExecutionAccess, async(req,res)=>{
 try{const window=require('../services/auditQuery.service').pagination(req,25);const data=await require('../models/hrAuditSave.model').find({executionId:req.executionId,auditId:req.auditScopeId}).select('version actor at status answers details assessment').sort({version:-1}).skip(window.skip).limit(window.limit+1).maxTimeMS(5000).lean();res.json({data:data.slice(0,window.limit),page:window.page,hasMore:data.length>window.limit});}
 catch(e){res.status(e.status||500).json({message:'HR history could not be loaded.'});}
});
