const express=require('express'),router=express.Router();let activeBodies=0;
const raw=express.raw({type:'application/octet-stream',limit:7100000});
router.post('/',(req,res,next)=>{
 res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
 try{req.careerIntake=require('../services/hrSignedSourceProfiles.service').profile();req.careerIntake.assertAvailable();}catch(error){return res.status(error.status||503).json({code:error.code||'EXTERNAL_DISABLED',message:'Approved career intake is unavailable.'});}
 if(req.headers['content-type']!=='application/octet-stream')return res.status(415).json({code:'EXTERNAL_MEDIA_TYPE',message:'Approved career intake is unavailable.'});
 if(activeBodies>=2)return res.status(429).json({code:'EXTERNAL_BUSY',message:'Approved career intake is unavailable.'});
 activeBodies++;let freed=false;const deadline=setTimeout(()=>{if(!res.headersSent)res.status(408).json({code:'EXTERNAL_INPUT',message:'Approved career intake is unavailable.'});req.destroy();},30000);const release=()=>{clearTimeout(deadline);if(!freed){freed=true;activeBodies--;}};res.once('finish',release);res.once('close',release);
 raw(req,res,error=>{clearTimeout(deadline);if(error)return res.status(error.status===413?413:400).json({code:'EXTERNAL_INPUT',message:'Approved career intake is unavailable.'});next();});
},async(req,res)=>{
 try{const result=await req.careerIntake.receive({sourceId:req.headers['x-inop-source-id'],commandId:req.headers['x-inop-command-id'],timestamp:req.headers['x-inop-timestamp'],signature:req.headers['x-inop-signature'],rawBody:req.body},req.socket.remoteAddress);res.status(202).json(result);}
 catch(error){res.status(error.code?.startsWith('EXTERNAL_')?(error.status||503):503).json({code:error.code?.startsWith('EXTERNAL_')?error.code:'EXTERNAL_UNAVAILABLE',message:'Approved career intake is unavailable.'});}
});
router.all('/',(_req,res)=>res.status(405).set('Allow','POST').json({code:'EXTERNAL_METHOD',message:'Approved career intake is unavailable.'}));
module.exports=router;
