const router=require('express').Router();
const {authorize}=require('../middleware/authorization.middleware');
const c=require('../controllers/hrAudit.controller');
router.get('/:auditId/action-people',...authorize('audit.action','read'),c.hrOnly,require('../middleware/auditScope.middleware').requireAuditParentAccess,async(req,res)=>{
 try{if(!await require('../models/audit.model').exists({_id:req.auditScopeId,auditType:'hr'}))return res.status(403).json({message:'HR audit required.'});res.json(await require('../services/hrAuditPeople.service').candidates(req.auditScopeId,req));}
 catch(e){res.status(e.status||500).json({message:e.status?e.message:'HR directory unavailable.'});}
});
router.get('/list',...authorize('audit','read'),c.hrOnly,c.list);
router.get('/options',...authorize('audit','read'),c.hrOnly,c.restaurants);
router.get('/analytics-options',...authorize('audit.analytics','read'),c.hrOnly,c.restaurants);
router.get('/sources',...authorize('audit','read'),c.hrOnly,c.sources);
router.get('/restaurants',...authorize('audit','create'),c.hrOnly,c.restaurants);
router.post('/templates/:brandId',...authorize('audit.template','create'),...authorize('audit.template','update'),c.hrOnly,c.provision);
router.post('/audits',...authorize('audit','create'),c.hrOnly,c.create);
router.get('/analytics',...authorize('audit.analytics','read'),c.hrOnly,c.analytics);
module.exports=router;
