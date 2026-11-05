// Uses the existing Mongo leases/retries; never creates a second intake queue.
function createWorker({enabled=false,profile=()=>require('./hrCvIntakeProfiles.service').profile(),schedule=setTimeout,cancel=clearTimeout}={}){
 let timer,running,stopped=true,last='idle',generation=0;
 async function tick(){
  if(!enabled||stopped)return {state:'disabled'};
  if(running)return {state:'busy'};
  const work=(async()=>{
   try{const service=profile();service.assertAvailable();await service.runOnce(1);last='completed';}
   catch{last='unavailable';} // Never log provider errors, documents or credentials.
   return {state:last};
  })();
  running=work;try{return await work;}finally{if(running===work)running=undefined;}
 }
 function queue(ticket){if(stopped||ticket!==generation)return;timer=schedule(async()=>{if(stopped||ticket!==generation)return;timer=undefined;await tick();queue(ticket);},last==='unavailable'?60000:10000);timer?.unref?.();}
 function start(){if(!enabled||!stopped)return;stopped=false;queue(++generation);}
 async function stop(){stopped=true;generation++;if(timer!==undefined)cancel(timer);timer=undefined;if(running)await running;}
 return Object.freeze({start,stop,tick,health:()=>({enabled,stopped,running:Boolean(running),last})});
}
module.exports={createWorker};
