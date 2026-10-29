const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {docx,pdf}=require('./helpers/cvDocuments.cjs');
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
 const {profile,scanner:scannerProfile}=load('hrCvIntakeProfiles.service.js',deps,env);
 assert.throws(()=>scannerProfile());
 assert.equal(profile(),disabled);assert.equal(calls.length,1);
 env.HR_CV_DURABLE_INTAKE_ENABLED='true';assert.equal(profile().list(),'metadata');
 env.HR_CV_SCAN_ENABLED='true';assert.equal(profile(),disabled);
 env.storageReady=true;env.HR_CV_SCAN_BINARY='/usr/bin/clamscan';
 const configured=profile();assert.equal(configured.options.store,store);assert.equal(configured.options.scanner,scanner);assert.equal(configured.options.ocrEngine,ocr);assert.equal(configured.options.scanBeforePersistence,true);assert.equal(configured.options.enabled,true);
 assert.equal(profile(),configured);assert.equal(scannerProfile(),scanner);
 env.HR_CV_SCAN_ENABLED='false';assert.throws(()=>scannerProfile());env.HR_CV_SCAN_ENABLED='true';
 env.HR_CV_DURABLE_INTAKE_ENABLED='false';assert.equal(profile(),disabled);
});
test('Configured intake never reserves or persists an original before a successful scanner verdict',async()=>{
 let indexReads=0,scans=0;
 const deps={
  mongoose:{},'../models/hrCvIntake.model':{collection:{indexes:async()=>{indexReads++;throw Error('Stop before any database write');}}},'../models/user.model':{},'../models/role.model':{},
  './hrCreateRecovery.service':{current:async()=>({user:{id:'synthetic'}}),identity:()=> 'synthetic'},'./hrResourceScope.service':{resourceFilter:()=>({})},
  './hrPrivateObjectStorage.service':{MAX_BYTES:5*1024*1024},'./documentWorkerPool.service':{pool:{run:async()=>true}},'./uploadContent.service':{types:{'.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.pdf':'application/pdf'}},'./cvParser.service':{},
  './hrCvIntakeContext.service':{validate:async()=>undefined},'./hrCvSourceReview.service':{createDuplicates:()=>()=>{}},'./hrCvIntakeList.service':{createList:()=>()=>{}},'./hrCvIntakeRetry.service':{createRetry:()=>()=>{}},'./hrCvIntakeApproval.service':{createApproval:()=>({})},
 };
 const {createIntake}=load('hrCvIntake.service.js',deps);
 const store={get:()=>{throw Error('Forbidden storage');},put:()=>{throw Error('Forbidden persistence');}};
 for(const [ext,bytes] of [['.docx',docx('Name: Synthetic Applicant\nSkills\nHACCP')],['.pdf',await pdf('Synthetic CV: HACCP')]]){
 const file={buffer:bytes,originalname:'synthetic'+ext,mimetype:deps['./uploadContent.service'].types[ext]};
 for(const verdict of ['unavailable','timeout','inconclusive','infected','wrong-hash','clean']){
  indexReads=0;
  const service=createIntake({enabled:true,store,scanBeforePersistence:true,scanner:{scan:async(input,context)=>{scans++;assert.deepEqual(input,bytes);assert.equal(context.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));if(['unavailable','timeout'].includes(verdict))throw Object.assign(Error('private scanner error'),{code:verdict==='timeout'?'AV_TIMEOUT':'AV_UNAVAILABLE'});return{verdict:verdict==='infected'?'infected':verdict==='inconclusive'?'unknown':'clean',sha256:verdict==='wrong-hash'?'0'.repeat(64):context.sha256,engine:'clamav',version:'1'};}}});
  await assert.rejects(service.enqueue({},file,crypto.randomUUID()),{code:verdict==='infected'?'INTAKE_QUARANTINED':verdict==='clean'?'INTAKE_DDL_REQUIRED':'INTAKE_SCAN_REQUIRED'});
  assert.equal(indexReads,verdict==='clean'?1:0);
 }
 }
 assert.equal(scans,12);
 const neverScan=createIntake({enabled:true,store,scanBeforePersistence:true,scanner:{scan:async()=>{throw Error('Scanner must not run for invalid input');}}});
 for(const file of [
  {buffer:Buffer.from('invalid'),originalname:'invalid.docx',mimetype:'application/pdf'},
  {buffer:Buffer.from('invalid'),originalname:'invalid.exe',mimetype:'application/pdf'},
  {buffer:Buffer.alloc(5*1024*1024+1),originalname:'large.pdf',mimetype:'application/pdf'},
 ])await assert.rejects(neverScan.enqueue({},file,crypto.randomUUID()),{code:'INTAKE_INPUT'});
 assert.throws(()=>createIntake({enabled:true,store,scanBeforePersistence:true}).assertAvailable(),{code:'INTAKE_SCAN_REQUIRED'});
});

test('Unix transport is opt-in under the same closed scan gate, never a native fallback',()=>{
 const env={HR_CV_SCAN_ENABLED:'true',HR_CV_SCAN_TRANSPORT:'clamd-unix',HR_CV_SCAN_SOCKET_PATH:'/run/inop/clamd.sock',HR_CV_SCAN_DAEMON_CONFIG:'/etc/inop/clamd.conf',HR_CV_SCAN_SOCKET_UID:'100'};let calls=0;
 const expected={scan:()=>{}};
 const {scanner}=load('hrCvIntakeProfiles.service.js',{'./hrClamScan.service':{createScanner:options=>{calls++;assert.equal(options.transport,'clamd-unix');assert.equal(options.enabled,true);assert.equal(options.socketPath,env.HR_CV_SCAN_SOCKET_PATH);assert.equal(options.daemonConfigPath,env.HR_CV_SCAN_DAEMON_CONFIG);assert.equal(options.socketUid,100);return expected;}}},env);
 assert.equal(scanner(),expected);assert.equal(scanner(),expected);assert.equal(calls,1);
 env.HR_CV_SCAN_ENABLED='false';assert.throws(()=>scanner());env.HR_CV_SCAN_ENABLED='true';env.HR_CV_SCAN_SOCKET_UID='-1';assert.throws(()=>scanner());env.HR_CV_SCAN_SOCKET_UID='100';env.HR_CV_SCAN_TRANSPORT='tcp';assert.throws(()=>scanner());assert.equal(calls,1);
});
