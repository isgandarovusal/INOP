const router=require('express').Router();
const {authorize}=require('../middleware/authorization.middleware');
const c=require('../controllers/serviceAudit.controller');
router.get('/:auditId/action-people',...authorize('audit.action','read'),c.serviceOnly,require('../middleware/auditScope.middleware').requireAuditParentAccess,async(req,res)=>{
 try{if(!await require('../models/audit.model').exists({_id:req.auditScopeId,auditType:'service'}))return res.status(403).json({message:'Service audit required.'});res.json(await require('../services/hrAuditPeople.service').candidates(req.auditScopeId,req));}
 catch(e){res.status(e.status||500).json({message:e.status?e.message:'HR directory unavailable.'});}
});
router.get('/list',...authorize('audit','read'),c.serviceOnly,c.list);
router.get('/options',...authorize('audit','read'),c.serviceOnly,c.restaurants);
router.get('/analytics-options',...authorize('audit.analytics','read'),c.serviceOnly,c.restaurants);
router.get('/sources',...authorize('audit','read'),c.serviceOnly,c.sources);
router.get('/restaurants',...authorize('audit','create'),c.serviceOnly,c.restaurants);
router.post('/templates/:brandId',...authorize('audit.template','create'),...authorize('audit.template','update'),c.serviceOnly,c.provision);
router.post('/audits',...authorize('audit','create'),c.serviceOnly,c.create);
router.get('/analytics',...authorize('audit.analytics','read'),c.serviceOnly,c.analytics);
module.exports=router;
