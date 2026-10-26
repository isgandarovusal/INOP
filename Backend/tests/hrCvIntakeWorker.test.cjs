const test=require('node:test'),assert=require('node:assert/strict');
const {createWorker}=require('../services/hrCvIntakeWorker.service');
test('Intake scheduler defaults off and never touches profile or timer',async()=>{
 const worker=createWorker({profile:()=>{throw Error('Unexpected profile');},schedule:()=>{throw Error('Unexpected timer');}});
 worker.start();assert.deepEqual(await worker.tick(),{state:'disabled'});await worker.stop();
});
test('One task, no overlap, sanitized failure, bounded backoff and stop without rescheduling',async()=>{
 let callback,delay,calls=0,release,fail=false;const pending=new Promise(r=>{release=r;});
 const worker=createWorker({enabled:true,schedule:(fn,ms)=>{callback=fn;delay=ms;return 1;},cancel:()=>{},profile:()=>({assertAvailable(){if(fail)throw Error('private credential');},async runOnce(limit){assert.equal(limit,1);calls++;await pending;}})});
 worker.start();worker.start();assert.equal(delay,10000);
 const first=worker.tick();assert.deepEqual(await worker.tick(),{state:'busy'});release();assert.deepEqual(await first,{state:'completed'});assert.equal(calls,1);
 fail=true;await callback();assert.equal(delay,60000);assert.equal(worker.health().last,'unavailable');assert.equal(calls,1);
 await worker.stop();assert.deepEqual(await worker.tick(),{state:'disabled'});
});
