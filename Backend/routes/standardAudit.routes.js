const router=require('express').Router();
const {authorize}=require('../middleware/authorization.middleware');
const c=require('../controllers/standardAudit.controller');
router.get('/:auditId/action-people',...authorize('audit.action','read'),c.standardOnly,require('../middleware/auditScope.middleware').requireAuditParentAccess,async(req,res)=>{
 try{if(!await require('../models/audit.model').exists({_id:req.auditScopeId,auditType:'standard'}))return res.status(403).json({message:'Standard audit required.'});res.json(await require('../services/hrAuditPeople.service').candidates(req.auditScopeId,req));}
 catch(e){res.status(e.status||500).json({message:e.status?e.message:'Audit directory unavailable.'});}
});
router.get('/list',...authorize('audit','read'),c.standardOnly,c.list);
router.get('/options',...authorize('audit','read'),c.standardOnly,c.restaurants);
router.get('/analytics-options',...authorize('audit.analytics','read'),c.standardOnly,c.restaurants);
router.get('/analytics-sources',...authorize('audit.analytics','read'),c.standardOnly,c.sources);
router.get('/sources',...authorize('audit','read'),c.standardOnly,c.sources);
router.get('/restaurants',...authorize('audit','create'),c.standardOnly,c.restaurants);
router.post('/templates/:brandId',...authorize('audit.template','create'),...authorize('audit.template','update'),c.standardOnly,c.provision);
router.post('/audits',...authorize('audit','create'),c.standardOnly,c.create);
router.get('/analytics',...authorize('audit.analytics','read'),c.standardOnly,c.analytics);
module.exports=router;
