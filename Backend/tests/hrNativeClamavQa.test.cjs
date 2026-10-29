const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createQa,syntheticFixtures}=require('../scripts/verifyNativeClamav.cjs');
const env={INOP_NATIVE_AV_QA_ENABLED:'true'};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Native QA is default-disabled and cannot run on Render or with any CV gate enabled',async()=>{
 for(const options of [{env:{}},{env,execute:false},{env:{...env,RENDER:'true'}},...['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'].map(k=>({env:{...env,['HR_CV_'+k+'_ENABLED']:'true'}}))]) {
  const output=[];let called=false;const q=createQa({env:options.env,emit:r=>output.push(r),scannerFactory:()=>{called=true;throw Error('Never construct');}});
  assert.equal(await q.run({execute:options.execute??true}),false);assert.equal(called,false);assert.ok(['NATIVE_AV_QA_DISABLED','NATIVE_AV_QA_SCOPE_REJECTED'].includes(output[0].code));
 }
});
test('Generated PDF/DOCX and harmless EICAR fixtures contain no external file/data input',async()=>{
 const f=await syntheticFixtures();assert.deepEqual(f.map(x=>x.label),['clean_pdf','clean_docx','eicar_raw','eicar_docx']);assert.equal(f[2].bytes.length,68);
 const {validContent}=require('../services/uploadContent.service');assert.equal(validContent(f[0].bytes,'.pdf'),true);assert.equal(validContent(f[1].bytes,'.docx'),true);assert.equal(validContent(f[3].bytes,'.docx'),true);
 // EICAR must be an exact standalone archive member, not XML-wrapped text.
 const zlib=require('node:zlib'),entries=new Map();let offset=0;
 while(f[3].bytes.readUInt32LE(offset)===0x04034b50){
  const b=f[3].bytes,size=b.readUInt32LE(offset+18),nameLength=b.readUInt16LE(offset+26),extraLength=b.readUInt16LE(offset+28);
  const start=offset+30+nameLength+extraLength,name=b.subarray(offset+30,offset+30+nameLength).toString();
  const raw=zlib.inflateRawSync(b.subarray(start,start+size));assert.equal(zlib.crc32(raw),b.readUInt32LE(offset+14));
  entries.set(name,raw);offset=start+size;
 }
 assert.equal(entries.size,3);assert.deepEqual(entries.get('word/embeddings/eicar.com'),f[2].bytes);
 assert.ok(!entries.get('word/document.xml').includes(f[2].bytes));
 assert.equal(f[3].bytes.readUInt16LE(f[3].bytes.length-22+10),3);
 assert.ok(f.every(x=>x.bytes.length<5*1024*1024));
});
test('Mock QA orchestration is explicitly not evidence of real engine execution',async()=>{
 const f=await syntheticFixtures(),output=[];let n=0;
 const q=createQa({env,fixtures:async()=>f,emit:r=>output.push(r),scannerFactory:options=>{
  assert.deepEqual(options,{enabled:true,binary:'/usr/bin/clamscan'});
  return{scan:async(bytes,c)=>{assert.equal(c.sha256,hash(bytes));return{sha256:c.sha256,verdict:f[n++].expected,engine:'clamav',version:'1.4.6-db12345'};}};
 }});assert.equal(await q.run({execute:true}),true);assert.equal(n,4);assert.equal(output.at(-1).productionReady,false);assert.ok(!JSON.stringify(output).includes(f[0].bytes.toString('base64')));
 assert.equal(await q.run({execute:true}),false);assert.equal(n,4);
});
test('Stale/missing definitions, timeout, unavailability, false-clean or malformed result fail closed',async()=>{
 for(const error of [Object.assign(Error('PRIVATE'),{code:'AV_DEFINITIONS'}),Object.assign(Error('PRIVATE'),{code:'AV_TIMEOUT'}),Object.assign(Error('PRIVATE'),{code:'AV_UNAVAILABLE'}),Error('PRIVATE')]){
  const out=[];let n=0;const q=createQa({env,emit:r=>out.push(r),scannerFactory:()=>({scan:async()=>{n++;throw error;}})});assert.equal(await q.run({execute:true}),false);assert.equal(n,1);assert.equal(out[0].productionReady,false);assert.ok(!JSON.stringify(out).includes('PRIVATE'));
 }
 for(const change of [{sha256:'0'.repeat(64)},{verdict:'unknown'},{engine:'other'},{version:'PRIVATE VALUE'}]){
  const out=[];const q=createQa({env,emit:r=>out.push(r),scannerFactory:()=>({scan:async(b)=>({sha256:hash(b),verdict:'clean',engine:'clamav',version:'1-db1',...change})})});assert.equal(await q.run({execute:true}),false);assert.equal(out.at(-1).code,'NATIVE_AV_QA_FAILED');
 }
 const out=[];const q=createQa({env,emit:r=>out.push(r),scannerFactory:()=>({scan:async(b)=>({sha256:hash(b),verdict:'clean',engine:'clamav',version:'1-db1'})})});assert.equal(await q.run({execute:true}),false);assert.equal(out.filter(r=>r.code==='NATIVE_AV_FIXTURE_PASS').length,2); // EICAR must not pass as clean.
});
test('Real-scanner QA workflow is manual-only, no secrets/storage/database/production startup linkage',()=>{
 const fs=require('node:fs'),path=require('node:path'),yaml=require('js-yaml'),root=path.join(__dirname,'../..');
 const source=fs.readFileSync(path.join(root,'.github/workflows/clamav-synthetic-qa.yml'),'utf8'),w=yaml.load(source);
 assert.deepEqual(Object.keys(w.on),['workflow_dispatch']);assert.equal(w.on.workflow_dispatch.inputs.run_native_qa.default,false);assert.deepEqual(w.permissions,{contents:'read'});assert.equal(w.concurrency['cancel-in-progress'],false);
 const job=w.jobs['native-qa'];assert.equal(job['runs-on'],'ubuntu-24.04');assert.equal(job['timeout-minutes'],15);assert.ok(job.if.includes('inputs.run_native_qa == true'));
 assert.ok(!/secrets\.|environment:|upload-artifact|HR_CV_STORAGE_|MONGO_URI|curl.*\|.*sh/.test(source.split('  persistent-unix-qa:')[0]));assert.ok(!/secrets\.|environment:|HR_CV_STORAGE_|MONGO_URI|curl.*\|.*sh/.test(source));assert.ok(source.includes('freshclam'));assert.ok(source.includes('--ignore-scripts'));assert.ok(!source.includes('|| true'));
 for(const step of job.steps)if(step.uses)assert.match(step.uses,/@[a-f0-9]{40}$/);
 for(const key of ['DURABLE_INTAKE','SCAN','INTAKE_WORKER','OCR','PROCESSING','AI_PROCESSING'])assert.equal(job.env['HR_CV_'+key+'_ENABLED'],'false');
 for(const p of ['Backend/server.js','Backend/package.json','Backend/routes/route.js','Backend/services/hrCvIntakeWorker.service.js'])assert.ok(!fs.readFileSync(path.join(root,p),'utf8').includes('verifyNativeClamav'));
});
