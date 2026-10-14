const router=require('express').Router();
const controller=require('../controllers/auditAction.controller');
const {authorize}=require('../middleware/authorization.middleware');
const {requireAuditParentAccess,requireAuditAccess}=require('../middleware/auditScope.middleware');
router.post('/',...authorize('audit.action','create'),requireAuditParentAccess,controller.createAction);
router.get('/audit/:auditId',...authorize('audit.action','read'),requireAuditParentAccess,controller.getActions);
router.put('/:id/status',...authorize('audit.action','update'),async(req,res,next)=>{
 if(!require('mongoose').isObjectIdOrHexString(req.params.id))return res.status(404).json({message:'Action not found.'});
 const row=await require('../models/auditAction.model').findById(req.params.id).select('auditId').lean();if(!row)return res.status(404).json({message:'Action not found.'});req.auditScopeId=String(row.auditId);next();
},requireAuditAccess,controller.updateActionStatus);
module.exports=router;
