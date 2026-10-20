const {workerData,parentPort}=require('node:worker_threads');
const command=Buffer.from(workerData.bytes).toString();
// A test-owned worker can hold queue capacity until AbortSignal cancels it.
if(command==='hold'){setInterval(()=>{},1000);return;}
if(command==='throw')throw Error('Synthetic private document must not be returned in diagnostics');
if(command==='exit')process.exit(9);
if(command.startsWith('wait:')){const end=performance.now()+Number(command.split(':')[1]);while(performance.now()<end){/* Controlled CPU load under 500 ms. */}}
if(command==='invalid')parentPort.postMessage({ok:true,value:{text:'x'.repeat(100001),warnings:[]}});
else if(command==='env')parentPort.postMessage({ok:true,value:Boolean(process.env.MONGO_URI||process.env.CS||process.env.JWT_SECRET||process.env.SMTP_PASS)});
else parentPort.postMessage({ok:true,value:true});
