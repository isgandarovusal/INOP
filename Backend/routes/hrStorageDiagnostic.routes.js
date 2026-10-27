// Temporary diagnostic; global verifyToken is registered before this router.
const router=require('express').Router();
const {requirePermission}=require('../middleware/auth.middleware');
const diagnostic=require('../services/hrStorageDiagnostic.service').createDiagnostic();
router.post('/',requirePermission('user','update'),async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try { const output=await diagnostic.execute(req);res.status(output.status).json(output.body); }
  catch { res.status(503).json({code:'DIAGNOSTIC_UNAVAILABLE'}); }
});
module.exports=router;
