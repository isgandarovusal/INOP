const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs/promises'),path=require('node:path'),{createRequire}=require('node:module'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const source=path.join(__dirname,'../services/hrCvOcrEngine.service.js'),base=createRequire(source),bytes=Buffer.from('%PDF-synthetic-lifecycle-only'),page=[{pageNumber:1,data:new Uint8Array([1])}];
async function load(deps){const module={exports:{}};vm.runInNewContext(await fs.readFile(source,'utf8'),{module,exports:module.exports,require:id=>deps[id]||base(id),__dirname:path.dirname(source),Buffer,Uint8Array,AbortController,AbortSignal,setTimeout,clearTimeout});return module.exports.createOcrEngine;}
const run=async(_binary,args)=>args.includes('--list-langs')?'eng\n':args.includes('--version')?'tesseract 5.5.0':'Synthetic recognition only';
const probe=factory=>factory({enabled:true,languages:['eng'],run:async()=>{throw Error('Synthetic over-admission');},render:async()=>page}).extract(bytes);

test('OCR cancellation retains capacity until renderer termination actually completes',async context=>{
 let entered,release,termination;const admitted=new Promise(r=>entered=r),stopped=new Promise(r=>termination=r);let env;
 class Worker extends EventEmitter{constructor(_file,options){super();env=options.env;this.stdout={resume(){}};this.stderr={resume(){}};entered();}terminate(){termination();return new Promise(r=>release=r);}}
 context.mock.timers.enable({apis:['setTimeout']});const factory=await load({'node:worker_threads':{Worker}}),pending=factory({enabled:true,languages:['eng'],timeoutMs:50,run}).extract(bytes);await admitted;context.mock.timers.tick(50);await stopped;
 try{await assert.rejects(pending,{code:'OCR_TIMEOUT'});await new Promise(r=>setImmediate(r));await assert.rejects(probe(factory),{code:'OCR_BUSY'});assert.deepEqual({...env},{NODE_ENV:'production'});}finally{release();await new Promise(r=>setImmediate(r));context.mock.timers.reset();}
 assert.equal((await factory({enabled:true,languages:['eng'],run,render:async()=>page}).extract(bytes)).text,'Synthetic recognition only');
});

test('OCR native child must close before private PNG cleanup and capacity recovery',async context=>{
 let entered,closed,image,unlinked=false,cleaned;const admitted=new Promise(r=>entered=r),cleanup=new Promise(r=>cleaned=r);
 function spawn(_binary,args){const child=new EventEmitter();child.stdout=new PassThrough();child.kill=signal=>{assert.equal(signal,'SIGKILL');return true;};
  if(args.includes('--list-langs')||args.includes('--version')){child.stdout.once('end',()=>child.emit('close',0));child.stdout.end(args.includes('--list-langs')?'eng\n':'tesseract 5.5.0\n');}
  else{image=args[0];closed=()=>child.emit('close',null);entered();}return child;
 }
 const privateFs={...fs,unlink:async file=>{unlinked=true;return fs.unlink(file);},rmdir:async dir=>{await fs.rmdir(dir);cleaned();}};
 context.mock.timers.enable({apis:['setTimeout']});const factory=await load({'node:child_process':{spawn},'node:fs/promises':privateFs}),pending=factory({enabled:true,languages:['eng'],timeoutMs:50,render:async()=>page}).extract(bytes);await admitted;assert.equal((await fs.stat(image)).mode&0o777,0o600);context.mock.timers.tick(50);
 try{await assert.rejects(pending,{code:'OCR_TIMEOUT'});await new Promise(r=>setImmediate(r));assert.equal(unlinked,false,'Do not delete a PNG still in use by an unclosed child');await assert.rejects(probe(factory),{code:'OCR_BUSY'});}finally{closed();await cleanup;await new Promise(r=>setImmediate(r));context.mock.timers.reset();}
 await assert.rejects(fs.stat(image),{code:'ENOENT'});assert.equal((await factory({enabled:true,languages:['eng'],run,render:async()=>page}).extract(bytes)).text,'Synthetic recognition only');
});

test('Successful renderer must terminate before starting native OCR work',async()=>{
 let terminated,release,created=false;const stopping=new Promise(r=>terminated=r);
 class Worker extends EventEmitter{constructor(){super();this.stdout={resume(){}};this.stderr={resume(){}};queueMicrotask(()=>this.emit('message',{ok:true,pages:[{pageNumber:1,data:new Uint8Array([137,80,78,71,13,10,26,10])}]}));}terminate(){terminated();return new Promise(r=>release=r);}}
 const factory=await load({'node:worker_threads':{Worker},'node:fs/promises':{...fs,mkdtemp:async(...args)=>{created=true;return fs.mkdtemp(...args);}}}),pending=factory({enabled:true,languages:['eng'],run}).extract(bytes);await stopping;
 try{await new Promise(r=>setImmediate(r));assert.equal(created,false,'Wait for renderer resources to be released before native OCR');}finally{release();}
 assert.equal((await pending).text,'Synthetic recognition only');
});

test('Renderer termination rejection stays fail-closed until a real exit is observed',async context=>{
 let admitted,worker;const entered=new Promise(r=>admitted=r);
 class Worker extends EventEmitter{constructor(){super();worker=this;this.threadId=7;this.stdout={resume(){}};this.stderr={resume(){}};admitted();}terminate(){return Promise.reject(Error('Synthetic termination failure'));}}
 context.mock.timers.enable({apis:['setTimeout']});const factory=await load({'node:worker_threads':{Worker}}),pending=factory({enabled:true,languages:['eng'],timeoutMs:50,run}).extract(bytes);await entered;context.mock.timers.tick(50);
 try{await assert.rejects(pending,{code:'OCR_TIMEOUT'});await new Promise(r=>setImmediate(r));await assert.rejects(probe(factory),{code:'OCR_BUSY'});}finally{worker.threadId=-1;worker.emit('exit',1);await new Promise(r=>setImmediate(r));context.mock.timers.reset();}
 assert.equal((await factory({enabled:true,languages:['eng'],run,render:async()=>page}).extract(bytes)).text,'Synthetic recognition only');
});

test('Native OCR output limit keeps its error and waits for child close before cleanup',async context=>{
 let admitted,child,closed,unlinked=false,killed;const entered=new Promise(r=>admitted=r),stopped=new Promise(r=>killed=r);
 function spawn(_binary,args){const process=new EventEmitter();process.stdout=new PassThrough();process.kill=signal=>{assert.equal(signal,'SIGKILL');killed();return true;};
  if(args.includes('--list-langs')||args.includes('--version')){process.stdout.once('end',()=>process.emit('close',0));process.stdout.end(args.includes('--list-langs')?'eng\n':'tesseract 5.5.0\n');}
  else{child=process;closed=()=>process.emit('close',1);admitted();}return process;
 }
 context.mock.timers.enable({apis:['setTimeout']});const factory=await load({'node:child_process':{spawn},'node:fs/promises':{...fs,unlink:async file=>{unlinked=true;return fs.unlink(file);}}}),pending=factory({enabled:true,languages:['eng'],render:async()=>page}).extract(bytes);let finished=false;pending.then(()=>{finished=true;},()=>{finished=true;});await entered;child.stdout.write(Buffer.alloc(100001,65));await stopped;
 try{await new Promise(r=>setImmediate(r));assert.equal(finished,false);assert.equal(unlinked,false);await assert.rejects(probe(factory),{code:'OCR_BUSY'});}finally{closed();}
 try{await assert.rejects(pending,{code:'OCR_LIMIT'});assert.equal(unlinked,true);}finally{context.mock.timers.reset();}
});
