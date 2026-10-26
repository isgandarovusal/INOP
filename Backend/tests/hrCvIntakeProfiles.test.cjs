const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {docx}=require('./helpers/cvDocuments.cjs');
function load(name,dependencies,env={}){
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../services',name),'utf8'),{module,exports:module.exports,require:id=>{if(id in dependencies)return dependencies[id];if(id.startsWith('node:'))return require(id);throw Error('Unexpected dependency '+id);},process:{env},Buffer,AbortController,setTimeout,clearTimeout});
 return module.exports;
}
test('Intake profile remains default-off, preserves metadata on bad config and reuses configured adapters',()=>{
 const calls=[],disabled={list:()=> 'metadata'},store={},scanner={},ocr={};
 const env={},deps={
  './hrCvIntake.service':{createIntake:options=>{calls.push(options);return options?{options}:disabled;}},
  './hrPrivateObjectStorage.service':{fromEnvironment:()=>{if(!env.storageReady)throw Error('secret must never escape');return store;}},
  './hrClamScan.service':{createScanner:options=>{assert.equal(options.enabled,true);assert.equal(options.binary,'/usr/bin/clamscan');return scanner;}},
  './hrCvOcrEngine.service':{createOcrEngine:options=>{assert.equal(options.enabled,false);return ocr;}},
 };
 const {profile}=load('hrCvIntakeProfiles.service.js',deps,env);
 assert.equal(profile(),disabled);assert.equal(calls.length,1);
 env.HR_CV_DURABLE_INTAKE_ENABLED='true';assert.equal(profile().list(),'metadata');
 env.HR_CV_SCAN_ENABLED='true';assert.equal(profile(),disabled);
 env.storageReady=true;env.HR_CV_SCAN_BINARY='/usr/bin/clamscan';
 const configured=profile();assert.equal(configured.options.store,store);assert.equal(configured.options.scanner,scanner);assert.equal(configured.options.ocrEngine,ocr);assert.equal(configured.options.scanBeforePersistence,true);assert.equal(configured.options.enabled,true);
 assert.equal(profile(),configured);
 env.HR_CV_DURABLE_INTAKE_ENABLED='false';assert.equal(profile(),disabled);
});
test('Configured intake never reserves or persists an original before a successful scanner verdict',async()=>{
 let indexReads=0,scans=0;const bytes=docx('Name: Synthetic Applicant\nSkills\nHACCP');
 const deps={
  mongoose:{},'../models/hrCvIntake.model':{collection:{indexes:async()=>{indexReads++;throw Error('Stop before any database write');}}},'../models/user.model':{},'../models/role.model':{},
  './hrCreateRecovery.service':{current:async()=>({user:{id:'synthetic'}}),identity:()=> 'synthetic'},'./hrResourceScope.service':{resourceFilter:()=>({})},
  './hrPrivateObjectStorage.service':{MAX_BYTES:5*1024*1024},'./documentWorkerPool.service':{pool:{run:async()=>true}},'./uploadContent.service':{types:{'.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}},'./cvParser.service':{},
  './hrCvIntakeContext.service':{validate:async()=>undefined},'./hrCvSourceReview.service':{createDuplicates:()=>()=>{}},'./hrCvIntakeList.service':{createList:()=>()=>{}},'./hrCvIntakeRetry.service':{createRetry:()=>()=>{}},'./hrCvIntakeApproval.service':{createApproval:()=>({})},
 };
 const {createIntake}=load('hrCvIntake.service.js',deps);
 const file={buffer:bytes,originalname:'synthetic.docx',mimetype:deps['./uploadContent.service'].types['.docx']};
 const store={get:()=>{throw Error('Forbidden storage');},put:()=>{throw Error('Forbidden persistence');}};
 for(const verdict of ['unavailable','infected','wrong-hash','clean']){
  const service=createIntake({enabled:true,store,scanBeforePersistence:true,scanner:{scan:async(input,context)=>{scans++;assert.deepEqual(input,bytes);assert.equal(context.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));if(verdict==='unavailable')throw Error('private scanner error');return{verdict:verdict==='infected'?'infected':'clean',sha256:verdict==='wrong-hash'?'0'.repeat(64):context.sha256,engine:'clamav',version:'1'};}}});
  await assert.rejects(service.enqueue({},file,crypto.randomUUID()),{code:verdict==='infected'?'INTAKE_QUARANTINED':verdict==='clean'?'INTAKE_DDL_REQUIRED':'INTAKE_SCAN_REQUIRED'});
  assert.equal(indexReads,verdict==='clean'?1:0);
 }
 assert.equal(scans,4);
 assert.throws(()=>createIntake({enabled:true,store,scanBeforePersistence:true}).assertAvailable(),{code:'INTAKE_SCAN_REQUIRED'});
});
