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

test('Restart during an in-flight stop keeps exactly one scheduler generation',async()=>{
 const scheduled=new Map();let serial=0,calls=0,release,entered;
 const ready=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 const worker=createWorker({enabled:true,schedule:(callback,delay)=>{const id=++serial;scheduled.set(id,{callback,delay});return id;},cancel:id=>scheduled.delete(id),profile:()=>({assertAvailable(){},async runOnce(){calls++;entered();await gate;}})});
 const fire=async id=>{const task=scheduled.get(id);assert.ok(task);scheduled.delete(id);await task.callback();};
 worker.start();const old=fire(1);await ready;const stopping=worker.stop();worker.start();assert.equal(scheduled.size,1);assert.equal(calls,1);
 await fire([...scheduled.keys()][0]);assert.equal(calls,1,'Restart cannot overlap the still-running old task');assert.equal(scheduled.size,1);
 release();await Promise.all([old,stopping]);assert.equal(scheduled.size,1,'Old callback must not create a second polling chain after restart');assert.equal(calls,1);
 const next=[...scheduled.keys()][0];await fire(next);assert.equal(calls,2);assert.equal(scheduled.size,1,'One due callback yields one task and one replacement timer');
 await worker.stop();assert.equal(scheduled.size,0);assert.equal(worker.health().stopped,true);
});

test('A canceled callback cannot erase or duplicate a restarted timer',async()=>{
 const scheduled=new Map();let serial=0,calls=0;
 const worker=createWorker({enabled:true,schedule:(callback,delay)=>{const id=++serial;scheduled.set(id,{callback,delay});return id;},cancel:id=>scheduled.delete(id),profile:()=>({assertAvailable(){},async runOnce(){calls++;}})});
 worker.start();const stale=scheduled.get(1).callback;await worker.stop();worker.start();worker.start();assert.equal(scheduled.size,1);
 await stale();assert.equal(calls,0,'A stale timer cannot run a task belonging to the new lifecycle');assert.equal(scheduled.size,1);
 await worker.stop();await worker.stop();assert.equal(scheduled.size,0,'Stop still owns and cancels the new timer');
});


test('Awaited stop and restart keep existing cadence and idempotent start behavior',async()=>{
 let scheduled=0,canceled=0;const callbacks=new Map();
 const worker=createWorker({enabled:true,schedule:(callback,delay)=>{assert.equal(delay,10000);callbacks.set(++scheduled,callback);return scheduled;},cancel:id=>{assert.ok(callbacks.delete(id));canceled++;},profile:()=>({assertAvailable(){},async runOnce(){}})});
 worker.start();worker.start();assert.equal(callbacks.size,1);await worker.stop();assert.equal(callbacks.size,0);worker.start();assert.equal(callbacks.size,1);await worker.stop();assert.equal(canceled,2);assert.equal(callbacks.size,0);
});
