const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),{Worker}=require('node:worker_threads');
const fail=(code,status=422)=>Object.assign(new Error('OCR document processing is unavailable.'),{code,status});
let active=0;
function command(binary,args,{signal,maxBytes=100000}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(fail('OCR_CANCELLED',499));let settled=false,size=0,chunks=[];
  const child=spawn(binary,args,{shell:false,stdio:['ignore','pipe','ignore'],env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',OMP_THREAD_LIMIT:'1'}});
  const abort=()=>{child.kill('SIGKILL');finish(fail('OCR_CANCELLED',499));};
  function finish(error,value){if(settled)return;settled=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);}
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){child.kill('SIGKILL');finish(fail('OCR_LIMIT'));}else chunks.push(chunk);});
  child.on('error',error=>finish(fail(error.code==='ENOENT'?'OCR_RUNTIME_REQUIRED':'OCR_FAILED',503)));
  child.on('close',code=>finish(code===0?null:fail('OCR_FAILED'),Buffer.concat(chunks).toString('utf8')));
 });
}
function renderPdf(bytes,signal){return new Promise((resolve,reject)=>{
 if(signal.aborted)return reject(fail('OCR_CANCELLED',499));let settled=false;
 const snapshot=Uint8Array.from(bytes),worker=new Worker(path.join(__dirname,'hrCvOcrRender.worker.cjs'),{workerData:{bytes:snapshot.buffer},transferList:[snapshot.buffer],resourceLimits:{maxOldGenerationSizeMb:192,maxYoungGenerationSizeMb:32,stackSizeMb:8},env:{NODE_ENV:'production'},stdout:true,stderr:true});
 worker.stdout.resume();worker.stderr.resume();
 function finish(error,value){if(settled)return;settled=true;signal.removeEventListener('abort',abort);void worker.terminate().catch(()=>{});error?reject(error):resolve(value);}
 const abort=()=>finish(fail('OCR_CANCELLED',499));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
 worker.once('error',()=>finish(fail('OCR_FAILED')));worker.once('exit',()=>{if(!settled)finish(fail('OCR_FAILED'));});worker.once('message',message=>{
  if(!message?.ok)return finish(fail(message?.code==='OCR_LIMIT'?'OCR_LIMIT':'OCR_INVALID_DOCUMENT'));
  if(!Array.isArray(message.pages)||!message.pages.length||message.pages.length>3||message.pages.some((p,i)=>p.pageNumber!==i+1||!(p.data instanceof Uint8Array)||p.data.length>4*1024*1024||!Buffer.from(p.data).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))))return finish(fail('OCR_FAILED'));
  finish(null,message.pages);
 });
});}
function createOcrEngine({enabled=false,binary='/usr/bin/tesseract',languages=['aze','eng','rus'],dataDirectory,timeoutMs=15000,render=renderPdf,run=command}={}){
 if(typeof binary!=='string'||!path.isAbsolute(binary)||!/^\/[a-zA-Z0-9_./-]{1,250}$/.test(binary)||path.basename(binary)!=='tesseract'||!Array.isArray(languages)||!languages.length||languages.length>3||new Set(languages).size!==languages.length||languages.some(l=>!['eng','aze','rus'].includes(l))||!Number.isInteger(timeoutMs)||timeoutMs<50||timeoutMs>15000)throw fail('OCR_CONFIG',400);
 if(dataDirectory!==undefined&&(typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory)||path.normalize(dataDirectory)!==dataDirectory||!/^\/[a-zA-Z0-9_./-]{1,250}$/.test(dataDirectory)))throw fail('OCR_CONFIG',400);
 const dataArgs=dataDirectory?['--tessdata-dir',dataDirectory]:[];
 languages=[...languages];
 async function available(signal){
  const installed=await run(binary,['--list-langs',...dataArgs],{signal,maxBytes:4096}),set=new Set(installed.split(/\r?\n/).map(l=>l.trim()));
  if(languages.some(l=>!set.has(l)))throw fail('OCR_LANGUAGE_REQUIRED',503);
  const text=await run(binary,['--version'],{signal,maxBytes:4096}),version=/\btesseract (\d{1,3}\.\d{1,3}\.\d{1,3})\b/.exec(text)?.[1];if(!version)throw fail('OCR_RUNTIME_REQUIRED',503);return{provider:'tesseract',version,languages:[...languages]};
 }
 async function extract(bytes,{signal}={}){
  if(!enabled)throw fail('OCR_DISABLED',503);
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>5*1024*1024||!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw fail('OCR_INVALID_DOCUMENT');
  if(signal?.aborted)throw fail('OCR_CANCELLED',499);if(active>=1)throw fail('OCR_BUSY',503);active++;
  bytes=Buffer.from(bytes);const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;let timer,dir,file;
  const cleanup=async()=>{let failed=false;if(file)try{await fs.unlink(file);}catch(error){if(error.code!=='ENOENT')failed=true;}if(dir)try{await fs.rmdir(dir);}catch(error){if(error.code!=='ENOENT')failed=true;}if(failed)throw fail('OCR_TEMP_CLEANUP_FAILED',503);};
  try{
   return await Promise.race([(async()=>{
    try{const engine=await available(combined);if(combined.aborted)throw fail('OCR_CANCELLED',499);
    const pages=await render(bytes,combined);if(!Array.isArray(pages)||!pages.length||pages.length>3||pages.some(p=>!(p.data instanceof Uint8Array)||!p.data.length||p.data.length>4*1024*1024))throw fail('OCR_LIMIT');if(combined.aborted)throw fail('OCR_CANCELLED',499);
    dir=await fs.mkdtemp(path.join(os.tmpdir(),'inop-ocr-'));if(combined.aborted)throw fail('OCR_CANCELLED',499);
    file=path.join(dir,'page.png');const chunks=[];let size=0;
    for(const page of pages){if(combined.aborted)throw fail('OCR_CANCELLED',499);await fs.writeFile(file,Buffer.from(page.data),{flag:'wx',mode:0o600});const text=await run(binary,[file,'stdout','-l',languages.join('+'),...dataArgs,'--psm','6'],{signal:combined,maxBytes:100000-size});if(combined.aborted)throw fail('OCR_CANCELLED',499);size+=Buffer.byteLength(text)+2;if(size>100000)throw fail('OCR_LIMIT');chunks.push(text.trim());await fs.unlink(file);}
    return{text:chunks.join('\n\n').trim(),engine,pages:pages.length};
    }finally{await cleanup();}
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail('OCR_TIMEOUT',503));},timeoutMs);})]);
  }catch(error){if(controller.signal.aborted&&!signal?.aborted)throw fail('OCR_TIMEOUT',503);if(error?.code?.startsWith('OCR_'))throw error;throw fail('OCR_FAILED');}
  finally{clearTimeout(timer);controller.abort();try{await cleanup();}finally{active--;}}
 }
 return Object.freeze({extract});
}
module.exports={createOcrEngine};
