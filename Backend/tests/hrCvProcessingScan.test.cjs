const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx}=require('./helpers/cvDocuments.cjs');
const {createProcessing}=require('../services/hrCvProcessing.service'),{createScanner}=require('../services/hrClamScan.service');
const Candidate=require('../models/candidate.model'),Jobs=require('../models/hrCvProcessingJob.model');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Every stored Candidate task attempt requires a new native-policy hash-bound clean scan',async t=>withAuditFixture(async h=>{
 await Jobs.createIndexes();await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'candidate',action:'read',scope:'own'},{resource:'candidate',action:'update',scope:'own'}]});
 const bytes=docx('Name: Synthetic private processing applicant\nSkills\nFood safety'),req={user:{id:String(h.actors.own._id)}};
 const clean=context=>({verdict:'clean',sha256:context.sha256,engine:'synthetic-only',version:'1'});
 async function setup({scanner,kind='parse',read=async()=>Buffer.from(bytes),parse,task,now,timeoutMs}={}){
  const row=await Candidate.create({name:'Synthetic stored applicant',role:'Cashier',createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A',cvUrl:'/uploads/synthetic.docx',cvOriginal:{sha256:sha(bytes),size:bytes.length,mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},cvReview:{version:'rules-2',provider:'rule-based'}});
  let tasks=0;const run=async input=>{tasks++;assert.equal(sha(kind==='parse'?input:input.bytes),sha(bytes),'Scanner receives a private copy, never parser-owned mutable bytes');if(parse)return parse(input);return{parsed:{name:'Synthetic extracted fact',extraction:{version:'rules-2',provider:'rule-based'}}};};
  const queue=createProcessing({enabled:true,scanner,read,...(now?{now}:{}),...(timeoutMs?{timeoutMs}:{}),...(kind==='parse'?{parse:run}:{kind,taskVersion:kind==='ocr'?'ocr-rules-1':'ai-professional-1',task:async input=>{await run(input);return task?task(input):{state:'blocked',code:'TEST_REVIEW_REQUIRED'};}})});
  const job=await queue.enqueue(req,row._id,{kind,expectedHash:sha(bytes),expectedRevision:0});return{row,queue,job,get tasks(){return tasks;}};
 }
 const stored=s=>Jobs.findById(s.job.id).select('+result').lean();
 for(const kind of ['parse','ocr','ai-review'])await t.test(kind+' invokes a fresh scanner before its task',async()=>{
  let scans=0;const s=await setup({kind,scanner:{scan:async(b,c)=>{scans++;assert.equal(sha(b),c.sha256);assert.equal(c.mimeType,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');assert.ok(c.signal);return clean(c);}}});await s.queue.runOnce(1);assert.equal(scans,1);assert.equal(s.tasks,1);
 });
 for(const [name,scan,code]of [
  ['unavailable',async()=>{throw Error('PRIVATE_SCANNER_ERROR');},'SCAN_REQUIRED'],
  ['inconclusive',async()=>({verdict:'unknown'}),'SCAN_REQUIRED'],
  ['wrong hash',async()=>({...clean({sha256:'0'.repeat(64)})}),'SCAN_REQUIRED'],
  ['malformed engine',async(_b,c)=>({...clean(c),engine:'PRIVATE\nBAD'}),'SCAN_REQUIRED'],
  ['infected',async()=>({verdict:'infected'}),'SOURCE_QUARANTINED'],
 ])await t.test(name+' never reaches extraction or leaks diagnostics',async()=>{
  const s=await setup({scanner:{scan}});await s.queue.runOnce(1);const job=await stored(s);assert.equal(s.tasks,0);assert.equal(job.state,'blocked');assert.equal(job.code,code);assert.equal(job.result,undefined);assert.ok(!JSON.stringify(await s.queue.get(req,s.job.id)).includes('PRIVATE'));if(name==='infected'){const replay=await s.queue.enqueue(req,s.row._id,{kind:'parse',expectedHash:sha(bytes),expectedRevision:0});assert.equal(replay.replayed,true);assert.equal(replay.state,'blocked');assert.equal(await Jobs.countDocuments({candidateId:s.row._id}),1);await assert.rejects(s.queue.retry(req,s.job.id,{expectedHash:sha(bytes),expectedRevision:0,expectedUpdatedAt:job.updatedAt.toISOString(),commandId:crypto.randomUUID()}),{code:'PROCESSING_RETRY_CONFLICT'});}
 });
 await t.test('disabled/unconfigured native scanner does not trust a stored source hash',async()=>{
  const profiles=require('../services/hrCvIntakeProfiles.service'),previous=profiles.scanner;profiles.scanner=()=>{throw Error('Synthetic scanner disabled');};
  try{const s=await setup();await s.queue.runOnce(1);assert.equal(s.tasks,0);assert.equal((await stored(s)).code,'SCAN_REQUIRED');}finally{profiles.scanner=previous;}
 });
 await t.test('native adapter rejects stale-definition metadata before parsing',async()=>{
  const clock=new Date(),scanner=createScanner({enabled:true,binary:'/usr/bin/clamscan',now:()=>clock,run:async()=>({code:0,output:'ClamAV 1.4.2/12345/'+new Date(clock-25*3600000).toUTCString().replace(/ GMT$/,'')+'\n'})});
  const s=await setup({scanner});await s.queue.runOnce(1);assert.equal(s.tasks,0);assert.equal((await stored(s)).code,'SCAN_REQUIRED');
 });
 await t.test('changed original bytes are rejected before scanner admission',async()=>{
  let scans=0;const s=await setup({scanner:{scan:async(_b,c)=>{scans++;return clean(c);}},read:async()=>Buffer.from('different synthetic original')});await s.queue.runOnce(1);assert.equal(scans,0);assert.equal(s.tasks,0);assert.equal((await stored(s)).code,'SOURCE_CHANGED');
 });
 for(const mode of ['revision','role'])await t.test(mode+' revocation during scan prevents all task execution',async()=>{
  let s;try{s=await setup({scanner:{scan:async(_b,c)=>{if(mode==='revision')await Candidate.updateOne({_id:s.row._id},{$inc:{__v:1}});else await h.models.Role.updateOne({key:'test_own'},{permissions:[]});return clean(c);}}});await s.queue.runOnce(1);assert.equal(s.tasks,0);assert.equal((await stored(s)).code,mode==='revision'?'SOURCE_CHANGED':'AUTH_REVOKED');}
  finally{await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'candidate',action:'read',scope:'own'},{resource:'candidate',action:'update',scope:'own'}]});}
 });
 await t.test('scanner cannot mutate immutable task bytes and a lost retry ack consumes one retry',async()=>{
  let scans=0,available=false;const s=await setup({scanner:{scan:async(b,c)=>{scans++;if(!available)throw Error('Synthetic outage');b.fill(0);return clean(c);}}});await s.queue.runOnce(1);assert.equal(s.tasks,0);const blocked=await s.queue.get(req,s.job.id);available=true;
  const input={expectedHash:sha(bytes),expectedRevision:0,expectedUpdatedAt:blocked.updatedAt.toISOString(),commandId:crypto.randomUUID()};const first=await s.queue.retry(req,s.job.id,input),second=await s.queue.retry(req,s.job.id,input);assert.equal(first.id,second.id);assert.equal(second.replayed,true);await s.queue.runOnce(1);assert.equal(scans,2);assert.equal(s.tasks,1);const job=await stored(s);assert.equal(job.manualRetries,1);assert.equal(job.attempts,2);assert.equal(job.state,'succeeded');
 });
 await t.test('automatic task retry performs another scan, never reuses the first clean verdict',async()=>{
  let scans=0,calls=0,clock=new Date();const s=await setup({now:()=>clock,scanner:{scan:async(_b,c)=>{scans++;return clean(c);}},parse:async()=>{if(++calls===1)throw Error('Synthetic task outage');return{parsed:{extraction:{version:'rules-2',provider:'rule-based'}}};}});await s.queue.runOnce(1);assert.equal((await stored(s)).state,'retry');clock=new Date(clock.getTime()+61000);await s.queue.runOnce(1);assert.equal(scans,2);assert.equal(s.tasks,2);assert.equal((await stored(s)).state,'succeeded');
 });
 await t.test('ignored late scanner cannot start a task after the existing processing deadline',async context=>{
  let enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
  const s=await setup({timeoutMs:50,scanner:{scan:async(_b,c)=>{enter();await gate;return clean(c);}}});
  // Advance only the existing deadline after scanner admission. Real Mongo
  // preflight latency must not turn this late-scanner test into an endless wait.
  context.mock.timers.enable({apis:['setTimeout']});const pending=s.queue.runOnce(1);
  try{await Promise.race([entered,pending.then(()=>{throw Error('Synthetic scanner was not admitted');})]);context.mock.timers.tick(50);await pending;assert.equal((await stored(s)).code,'PROCESSING_TIMEOUT');assert.equal(s.tasks,0);}finally{release();await new Promise(r=>setImmediate(r));context.mock.timers.reset();}
  assert.equal(s.tasks,0);assert.equal((await stored(s)).result,undefined);
  // This owned timeout fixture must not be reclaimed by the later 25h clock
  // jump, which tests another job's antivirus definitions rather than queue order.
  await Jobs.updateOne({_id:s.job.id},{$set:{nextAttemptAt:new Date(Date.now()+365*24*3600000)}});
 });
 await t.test('fresh definitions on one attempt cannot authorize a retry after they expire',async()=>{
  let clock=new Date(),versionCalls=0,parseCalls=0;const definitionDate=clock.toUTCString().replace(/ GMT$/,'');
  const scanner=createScanner({enabled:true,binary:'/usr/bin/clamscan',now:()=>clock,run:async(_binary,args)=>{if(args.includes('--version')){versionCalls++;return{code:0,output:'ClamAV 1.4.2/12345/'+definitionDate+'\n'};}return{code:0,output:'stdin: OK\n'};}});
  const s=await setup({now:()=>clock,scanner,parse:async()=>{parseCalls++;throw Error('Synthetic transient parser failure');}});await s.queue.runOnce(1);assert.equal((await stored(s)).state,'retry');clock=new Date(clock.getTime()+25*3600000);await s.queue.runOnce(1);assert.equal(versionCalls,2);assert.equal(parseCalls,1);assert.equal((await stored(s)).code,'SCAN_REQUIRED');assert.equal((await stored(s)).result,undefined);
 });
 await t.test('retry-actor revocation during scan cannot borrow the original creator authority',async()=>{
  let available=false;const s=await setup({scanner:{scan:async(_b,c)=>{if(!available)throw Error('Synthetic outage');await h.models.User.updateOne({_id:h.actors.admin._id},{isActive:false});return clean(c);}}});await s.queue.runOnce(1);const blocked=await s.queue.get(req,s.job.id);
  await s.queue.retry({user:{id:String(h.actors.admin._id)}},s.job.id,{expectedHash:sha(bytes),expectedRevision:0,expectedUpdatedAt:blocked.updatedAt.toISOString(),commandId:crypto.randomUUID()});available=true;
  try{await s.queue.runOnce(1);assert.equal(s.tasks,0);assert.equal((await stored(s)).code,'AUTH_REVOKED');}finally{await h.models.User.updateOne({_id:h.actors.admin._id},{isActive:true});}
 });
}));
