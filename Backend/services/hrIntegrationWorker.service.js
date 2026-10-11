const fail=code=>Object.assign(new Error('Approved HR integration worker is unavailable.'),{code,status:503});
// No interval/boot/global env activation. Hosting binding remains external gate.
function createWorker({enabled=false,context,intake,sync,mailboxIds=[],intervalMs=60000,clock=()=>Date.now()}={}){
 if(enabled&&(!context||typeof context.request!=='function'||!intake||typeof intake.runOnce!=='function'||!sync||typeof sync.sync!=='function'||!Array.isArray(mailboxIds)||!mailboxIds.length||mailboxIds.length>10||new Set(mailboxIds).size!==mailboxIds.length||mailboxIds.some(v=>!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v))||!Number.isInteger(intervalMs)||intervalMs<60000||intervalMs>3600000))throw fail('HR_WORKER_CONFIG');
 let running,stopped=false,timer,last=null,index=0;const due=new Map();
 const health=()=>({enabled,stopped,running:Boolean(running),last:last?{...last}:null});
 async function tick(){if(!enabled)throw fail('HR_WORKER_DISABLED');if(stopped)throw fail('HR_WORKER_STOPPED');if(running)throw fail('HR_WORKER_BUSY');
  const task=(async()=>{let syncState='not_due',parseState='not_run';const mailbox=mailboxIds[index++%mailboxIds.length],at=clock();try{if((due.get(mailbox)||0)<=at){due.set(mailbox,at+intervalMs);await sync.sync(context.request(),mailbox);syncState='completed';}}catch{syncState='unavailable';}
   if(!stopped)try{await intake.runOnce(2);parseState='completed';}catch{parseState='unavailable';}
   last={at:new Date(at).toISOString(),syncState,parseState};return health();
  })();running=task;try{await task;}finally{if(running===task)running=null;}return health();
 }
 function start(){if(!enabled)throw fail('HR_WORKER_DISABLED');if(stopped)throw fail('HR_WORKER_STOPPED');if(timer)return;timer=setInterval(()=>{void tick().catch(()=>{});},Math.min(intervalMs,10000));timer.unref?.();}
 async function stop(){stopped=true;if(timer){clearInterval(timer);timer=null;}if(running)await running;}
 return Object.freeze({tick,start,stop,health});
}
module.exports={createWorker};
