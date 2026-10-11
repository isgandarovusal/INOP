const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Candidate=require('../models/candidate.model'),Manifest=require('../models/hrCvOriginalManifest.model');
const {fingerprint}=require('../services/hrCvProcessing.service'),{createArchive}=require('../services/hrCvOriginalArchive.service');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Original archive preparation preserves immutable originals with current scope, quarantine and bounded recovery',async t=>withAuditFixture(async h=>{
 const bytes=Buffer.from('synthetic-local-original-not-a-real-CV'),objects=new Map();let reads=0,scans=0,puts=0,gets=0;
 const read=async()=>{reads++;return Buffer.from(bytes);},scanner={scan:async value=>{scans++;return {verdict:'clean',sha256:hash(value),engine:'mock-only',version:'test-1'};}};
 const store={get:async ref=>{gets++;if(!objects.has(ref.key))throw Object.assign(Error('Synthetic missing'),{code:'STORAGE_NOT_FOUND'});return Buffer.from(objects.get(ref.key));},put:async(ref,value)=>{
  puts++;const saved=await Manifest.findOne({'blob.key':ref.key}).select('+blob').lean();assert.ok(saved,'server manifest must exist before PUT');assert.deepEqual(saved.blob,ref);
  if(objects.has(ref.key))throw Object.assign(Error('Synthetic conditional conflict'),{code:'STORAGE_WRITE_CONFLICT'});objects.set(ref.key,Buffer.from(value));
 }};
 const options={enabled:true,read,scanner,store,evidenceMode:'test'},archive=createArchive(options),req=actor=>({user:{id:String(h.actors[actor]._id)}});
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{permissions:[{resource:'candidate',action:'read',scope},{resource:'candidate',action:'update',scope}]});
 async function cv(owner='own'){return Candidate.create({name:'DO_NOT_EXPORT_PRIVATE_NAME',email:'private@example.invalid',role:'Cashier',createdBy:h.actors[owner]._id,assignedTo:h.actors[owner==='own'?'assigned':owner]._id,departmentId:owner==='own'?'dep_A':'dep_B',cvUrl:'/uploads/synthetic.pdf',cvOriginal:{sha256:hash(bytes),size:bytes.length,mimeType:'application/pdf',originalName:'DO_NOT_EXPORT_FILENAME.pdf'}});}
 const input=c=>({expectedRevision:c.__v??0,sourceHash:c.cvOriginal.sha256,contextHash:fingerprint(c.toObject())});
 const run=(c,actor='own',service=archive)=>service.archive(req(actor),c._id,input(c));
 await t.test('default-disabled and missing DDL cannot read bytes or write manifest; no auto DDL or TTL',async()=>{
  const c=await cv();await assert.rejects(run(c,'own',createArchive()),{code:'ARCHIVE_DISABLED'});await assert.rejects(run(c),{code:'ARCHIVE_DDL_REQUIRED'});
  assert.equal(reads,0);assert.equal(await Manifest.countDocuments(),0);assert.equal(Manifest.schema.options.autoCreate,false);assert.equal(Manifest.schema.options.autoIndex,false);assert.ok(!Manifest.schema.indexes().some(([,o])=>'expireAfterSeconds'in o));await Manifest.createIndexes();
 });
 for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' archives only current source, retains Candidate/native original and immutable server key',async()=>{
  const c=await cv(),before=await Candidate.findById(c._id).lean(),result=await run(c,actor);assert.equal(result.state,'verified');assert.equal(result.evidenceMode,'test');assert.equal(result.candidateAttached,false);assert.equal(result.recoveryVerified,false);assert.equal(result.attempts,1);
  const saved=await Manifest.findById(result.id).select('+blob +scan +leaseToken +slot').lean();assert.equal(saved.blob.sha256,hash(bytes));assert.equal(saved.scan.sha256,hash(bytes));assert.ok(objects.has(saved.blob.key));assert.equal(saved.slot,undefined);assert.equal(saved.leaseToken,undefined);assert.deepEqual(await Candidate.findById(c._id).lean(),before);
  for(const sensitive of ['DO_NOT_EXPORT','private@example','/uploads/','hr/cv/','scan','slot','leaseToken'])assert.ok(!JSON.stringify(result).includes(sensitive));
  const beforeCalls=[reads,scans,puts,gets],replay=await run(c,actor);assert.equal(replay.id,result.id);assert.equal(replay.replayed,true);assert.deepEqual([reads,scans,puts,gets],beforeCalls);
 });
 await t.test('foreign parent, none/missing department and mixed grants fail before external work; forged grants ignored',async()=>{
  const c=await cv('foreign'),before=[reads,scans,puts,gets];for(const actor of ['own','department','assigned','none','department_missing'])await assert.rejects(run(c,actor),e=>[403,404].includes(e.status));
  await assert.rejects(archive.archive({user:{id:String(h.actors.own._id),role:'admin'},authRole:{permissions:[{resource:'*',action:'*',scope:'all'}]}},c._id,input(c)),{status:404});
  const permissions=[{resource:'candidate',action:'read',scope:'all'},{resource:'candidate',action:'update',scope:'own'}];await h.models.Role.updateOne({key:'test_own'},{permissions});try{await assert.rejects(run(c),{status:404});}finally{await h.models.Role.updateOne({key:'test_own'},{permissions:permissions.map(p=>({...p,scope:'own'}))});}assert.deepEqual([reads,scans,puts,gets],before);
 });
 await t.test('only exact source input accepted: no actor/key/privilege attachment from client',async()=>{
  const c=await cv();for(const bad of [{...input(c),actorId:String(h.actors.admin._id)},{...input(c),blob:{}},{...input(c),expectedRevision:'0'},{...input(c),sourceHash:['a'.repeat(64)]},{...input(c),contextHash:'bad'}])await assert.rejects(archive.archive(req('own'),c._id,bad),{code:'ARCHIVE_INPUT'});
  await assert.rejects(archive.archive(req('own'),c._id,{...input(c),sourceHash:'a'.repeat(64)}),{code:'ARCHIVE_SOURCE_CHANGED'});
 });
 await t.test('scanner missing/unknown/infected/hash-mismatched and unknown MIME block before object PUT',async()=>{
  for(const scan of [undefined,async()=>({verdict:'unknown'}),async()=>({verdict:'infected'}),async()=>({verdict:'clean',sha256:'a'.repeat(64),engine:'mock',version:'1'})]){
   const c=await cv(),before=puts,result=await run(c,'own',createArchive({...options,scanner:scan?{scan}:undefined}));assert.equal(result.state,'blocked');assert.ok(['ARCHIVE_SCAN_REQUIRED','ARCHIVE_QUARANTINED'].includes(result.code));assert.equal(puts,before);assert.equal((await Manifest.findById(result.id).select('+blob').lean()).blob,undefined);
  }
  const c=await cv();await Candidate.updateOne({_id:c._id},{$unset:{'cvOriginal.mimeType':1}});const refreshed=await Candidate.findById(c._id);const result=await run(refreshed);assert.equal(result.code,'ARCHIVE_SOURCE_BYTES');
 });
 await t.test('unconfigured storage, wrong original bytes and corrupt readback never claim verified',async()=>{
  const noStore=await run(await cv(),'own',createArchive({...options,store:undefined}));assert.equal(noStore.code,'ARCHIVE_STORAGE_REQUIRED');
  const wrong=await run(await cv(),'own',createArchive({...options,read:async()=>Buffer.from('wrong')}));assert.equal(wrong.code,'ARCHIVE_SOURCE_BYTES');
  const corrupt=await run(await cv(),'own',createArchive({...options,store:{...store,get:async()=>Buffer.from('corrupt')}}));assert.equal(corrupt.code,'ARCHIVE_READBACK');assert.equal(corrupt.state,'blocked');
 });
 await t.test('uncertain PUT survives process recreation, reconciles the same key once and never duplicates/deletes originals',async()=>{
  const c=await cv();let uncertain=true;const uncertainStore={...store,put:async(...args)=>{await store.put(...args);if(uncertain){uncertain=false;throw Object.assign(Error('PRIVATE_PROVIDER_PAYLOAD'),{code:'STORAGE_WRITE_UNCERTAIN'});}}};
  const first=await run(c,'own',createArchive({...options,store:uncertainStore}));assert.equal(first.state,'retry');assert.equal(first.code,'ARCHIVE_WRITE_UNCERTAIN');const saved=await Manifest.findById(first.id).select('+blob').lean(),beforePuts=puts;
  const second=await run(c,'own',createArchive({...options,store:uncertainStore}));assert.equal(second.id,first.id);assert.equal(second.state,'verified');assert.equal(second.attempts,2);assert.equal(puts,beforePuts);assert.equal((await Manifest.findById(first.id).select('+blob').lean()).blob.key,saved.blob.key);assert.ok(objects.has(saved.blob.key));assert.ok(!JSON.stringify(saved).includes('PRIVATE_PROVIDER_PAYLOAD'));
 });
 await t.test('three attempts across recreation are a lifetime bound; private provider errors are metadata-only',async()=>{
  const c=await cv(),outage={...store,get:async()=>{throw Error('PRIVATE_PROVIDER_PAYLOAD_TOKEN_CV');}};let result;
  for(let i=1;i<=3;i++){result=await run(c,'own',createArchive({...options,store:outage}));assert.equal(result.attempts,i);assert.equal(result.state,i===3?'failed':'retry');assert.equal(result.code,'ARCHIVE_PROVIDER_UNAVAILABLE');}
  assert.equal((await run(c)).replayed,true);assert.equal((await Manifest.findById(result.id).select('+slot').lean()).slot,undefined);assert.ok(!JSON.stringify(await Manifest.findById(result.id).lean()).includes('PRIVATE_PROVIDER_PAYLOAD'));
 });
 async function delayed(kind){
  const c=await cv();let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),beforePuts=puts;
  const delayedReader=async()=>{entered();await gate;return bytes;},pending=run(c,kind==='assignment'?'assigned':'own',createArchive({...options,read:delayedReader}));await ready;
  if(kind==='role')await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_none'});
  if(kind==='assignment')await Candidate.updateOne({_id:c._id},{assignedTo:h.actors.foreign._id});
  if(kind==='timestamp')await Candidate.updateOne({_id:c._id},{name:'Concurrent source edit'});
  release();try{await assert.rejects(pending,e=>[403,404,409].includes(e.status));assert.equal(puts,beforePuts);const saved=await Manifest.findOne({candidateId:c._id}).select('+slot').lean();assert.equal(saved.state,'obsolete');assert.equal(saved.slot,undefined);}finally{if(kind==='role')await h.models.User.updateOne({_id:h.actors.own._id},{role:'test_own'});}
 }
 await t.test('role/assignment/timestamp changed during IO cannot authorize old bytes',async()=>{for(const kind of ['role','assignment','timestamp'])await delayed(kind);});
 await t.test('source changes during PUT retain object/manifest but refuse publication and Candidate attachment',async()=>{
  const c=await cv(),before=await Candidate.findById(c._id).lean();let key;
  const pending=run(c,'own',createArchive({...options,store:{...store,put:async(ref,value)=>{await store.put(ref,value);key=ref.key;await Candidate.updateOne({_id:c._id},{$inc:{__v:1}});}}}));
  await assert.rejects(pending,{code:'ARCHIVE_SOURCE_CHANGED'});assert.ok(objects.has(key));const row=await Manifest.findOne({candidateId:c._id}).select('+blob').lean();assert.equal(row.state,'obsolete');assert.equal(row.blob.key,key);const after=await Candidate.findById(c._id).select('+privateCvBlob').lean();assert.equal(after.cvUrl,before.cvUrl);assert.equal(after.privateCvBlob,undefined);
 });
 await t.test('concurrent identical contexts share one reservation; unique active slot enforces cross-instance bound',async()=>{
  const c=await cv();let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const held={...options,slot:()=>0,read:async()=>{entered();await gate;return bytes;}},pending=run(c,'own',createArchive(held));await ready;
  try{await assert.rejects(run(c,'own',createArchive(options)),{code:'ARCHIVE_BUSY'});await assert.rejects(run(await cv(),'hr',createArchive({...options,slot:()=>0})),{code:'ARCHIVE_BUSY'});assert.equal(await Manifest.countDocuments({candidateId:c._id}),1);assert.equal(await Manifest.countDocuments({slot:0}),1);}finally{release();}assert.equal((await pending).state,'verified');
 });
 await t.test('deadline aborts ignored adapters; late work cannot scan/write/publish after released lease',async()=>{
  const c=await cv();let release,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),beforePuts=puts,beforeScans=scans;
  const pending=run(c,'own',createArchive({...options,timeoutMs:30,read:async()=>{entered();await gate;return bytes;}}));await ready;const result=await pending;assert.equal(result.state,'retry');assert.equal(result.code,'ARCHIVE_TIMEOUT');release();await new Promise(r=>setTimeout(r,50));assert.equal(puts,beforePuts);assert.equal(scans,beforeScans);assert.equal((await Manifest.findById(result.id).lean()).state,'retry');
 });
 await t.test('expired lease recovery retains key; a stale owner cannot overwrite a replacement lease',async()=>{
  const c=await cv();let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),pending=run(c,'own',createArchive({...options,read:async()=>{entered();await gate;return bytes;}}));await ready;
  const row=await Manifest.findOne({candidateId:c._id});await Manifest.updateOne({_id:row._id},{$set:{leaseToken:'replacement-owner'}});release();await assert.rejects(pending,{code:'ARCHIVE_LEASE_LOST'});assert.equal((await Manifest.findById(row._id).select('+leaseToken').lean()).leaseToken,'replacement-owner');await Manifest.updateOne({_id:row._id},{$set:{leaseUntil:new Date(0)}});assert.equal((await run(c)).state,'verified');
 });
 await t.test('hidden manifest fields do not leak through model serialization; test evidence cannot become provider evidence',async()=>{
  const c=await cv(),result=await run(c),row=await Manifest.findById(result.id).select('+blob +scan +contextKey +sourceFingerprint +slot +leaseToken');const serialized=row.toJSON();for(const k of ['blob','scan','contextKey','sourceFingerprint','slot','leaseToken'])assert.equal(serialized[k],undefined);
  const provider=await run(c,'own',createArchive({...options,evidenceMode:'provider',scanner:undefined}));assert.notEqual(provider.id,result.id);assert.equal(provider.state,'blocked');assert.equal(provider.evidenceMode,'provider');
 });
}));
