// Owned loopback MongoDB acceptance only. No environment provider or credentials.
const mongoose=require('mongoose');
process.once('message',async input=>{
 try{
  if(!/^inop_audit_test_\d+_[a-f0-9]{12}$/.test(input.database)||input.port!==27018)throw Error('Owned fixture required');
  await mongoose.connect(`mongodb://127.0.0.1:27018/${input.database}?directConnection=true`,{autoIndex:false,autoCreate:false});
  const bytes=Buffer.from(input.bytes,'base64');
  const service=require('../../services/hrCvIntake.service').createIntake({enabled:true,evidenceMode:'test',store:{put:async()=>{throw Error('No writes');},get:async()=>{if(input.outage)throw Error('Synthetic storage outage');return Buffer.from(bytes);}},scanner:{scan:async(_,context)=>({verdict:'clean',sha256:context.sha256,engine:'synthetic',version:'1'})},parse:async()=>{
   if(input.pause){process.send({phase:'paused'});await new Promise(resolve=>process.once('message',resolve));}
   return{text:'Synthetic worker evidence',parsed:{skills:['Food safety'],extraction:{version:'rules-2',provider:'rule-based',fields:{skills:{source:'cv-text',evidence:['Food safety']}}}}};
  }});
  process.send({phase:'ready'});await new Promise(resolve=>process.once('message',resolve));
  const result=await service.runOnce(1);process.send({phase:'done',processed:result.processed});
 }catch{process.send({phase:'error'});process.exitCode=1;}
 finally{await mongoose.disconnect();process.disconnect();}
});
