const mongoose=require('mongoose');
exports.createHandler=({connection=mongoose.connection,storage=require('./auditEvidenceStorage.service'),timeoutMs=1500}={})=>async(_req,res)=>{
 let timer;let database=false,transactions=false;try{if(connection.readyState===1){const hello=await Promise.race([connection.db.admin().command({hello:1,maxTimeMS:timeoutMs}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Readiness budget exceeded.')),timeoutMs);})]);database=true;transactions=Boolean(hello.setName&&hello.isWritablePrimary||hello.msg==='isdbgrid');}}catch{/* Never expose topology, credentials or driver errors. */}finally{clearTimeout(timer);}
 let configured=false;try{storage.fromEnvironment();configured=true;}catch{/* Provider configuration is a separate release gate. */}
 const ready=database&&transactions&&configured;return res.status(ready?200:503).json({success:ready,status:ready?'ready':'not-ready',checks:{database,transactions,storageConfigured:configured},productionSmokeVerified:false});
};
