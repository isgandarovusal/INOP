// QA-only process group ownership. Never uses killall/pkill or shared processes.
const {spawn}=require('node:child_process');
function runQaProcess(executable,args,{timeoutMs=480000,...options}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>3600000)throw Error('Invalid QA deadline');
 return new Promise(resolve=>{
  const child=spawn(executable,args,{...options,detached:true});let timer,grace,timedOut=false,finished=false;
  const kill=signal=>{if(child.pid)try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
  const cancel=()=>{kill('SIGKILL');process.exit(143);};process.once('SIGTERM',cancel);process.once('SIGINT',cancel);
  const finish=(status,signal,error)=>{if(finished)return;finished=true;clearTimeout(timer);clearTimeout(grace);kill('SIGKILL');process.removeListener('SIGTERM',cancel);process.removeListener('SIGINT',cancel);resolve({status:timedOut?124:status,signal,error,timedOut});};
  child.once('error',error=>finish(null,null,{code:error.code}));child.once('exit',(status,signal)=>finish(status,signal));
  timer=setTimeout(()=>{timedOut=true;kill('SIGTERM');grace=setTimeout(()=>kill('SIGKILL'),5000);},timeoutMs);
 });
}
module.exports={runQaProcess};
// A broken browser/Vite close must fail QA and preserve its cache, not hang.
module.exports.closeWithin=async function(promises,timeoutMs=20000){let timer;try{return await Promise.race([Promise.allSettled(promises),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned QA cleanup exceeded deadline')),timeoutMs);})]);}finally{clearTimeout(timer);}};
