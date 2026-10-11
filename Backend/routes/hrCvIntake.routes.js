const router=require('express').Router();
const {authorize}=require('../middleware/authorization.middleware');
const upload=require('multer')({storage:require('multer').memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:3,parts:5,fieldSize:1024}}).single('cv');
function available(req,res,next){try{req.cvIntakeQueue=require('../services/hrCvIntakeProfiles.service').profile();req.cvIntakeQueue.assertAvailable();next();}catch(error){res.status(error.status||503).json({code:error.code||'INTAKE_DISABLED',message:'Private CV intake is unavailable.'});}}
function endpoint(action){return async(req,res,next)=>{
 res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
 try{const service=req.cvIntakeQueue||require('../services/hrCvIntakeProfiles.service').profile();
  const result=action==='retry'?await service.retry(req,req.params.id,req.body):action==='duplicates'?await service.duplicates(req,req.params.id):action==='list'?await service.list(req,req.query):action==='enqueue'?await service.enqueue(req,req.file,req.body.commandId):action==='reconcile'?await service.reconcile(req,req.params.id,req.body):action==='approve'?await service.approve(req,req.params.id,req.body):action==='original'?await service.original(req,req.params.id):await service.get(req,req.params.id);
  if(action==='original'){res.set('Content-Security-Policy',"sandbox; default-src 'none'");return res.attachment('CV'+(result.mimeType==='application/pdf'?'.pdf':'.docx')).type(result.mimeType).send(result.bytes);}
  return res.status(action==='enqueue'?202:200).json(result);
 }catch(error){if(error.code?.startsWith('INTAKE_')||error.code?.startsWith('HR_')||error.code==='JOB_NOT_OPEN')return res.status(error.status||503).json({code:error.code,message:'Private CV intake is unavailable.'});next(error);}
};}
router.post('/',...authorize('candidate','create'),...authorize('candidate','read'),available,upload,endpoint('enqueue'));
router.get('/',...authorize('candidate','read'),endpoint('list'));
router.get('/:id/duplicates',...authorize('candidate','read'),endpoint('duplicates'));
router.get('/:id',...authorize('candidate','read'),endpoint('get'));
router.get('/:id/original',...authorize('candidate','read'),endpoint('original'));
router.post('/:id/retry',...authorize('candidate','create'),...authorize('candidate','read'),endpoint('retry'));
router.post('/:id/reconcile',...authorize('candidate','create'),...authorize('candidate','read'),endpoint('reconcile'));
router.post('/:id/approve',...authorize('candidate','create'),...authorize('candidate','read'),endpoint('approve'));
module.exports=router;
