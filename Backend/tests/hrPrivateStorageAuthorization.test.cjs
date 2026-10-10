const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {Readable}=require('node:stream');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx,pdf}=require('./helpers/cvDocuments.cjs');
const Candidate=require('../models/candidate.model'),Revoked=require('../models/revokedToken.model'),{uploadsDir}=require('../middleware/privateUpload.middleware');
const storage=require('../services/hrPrivateObjectStorage.service'),ai=require('../services/hrAiProvider.service');
const config={provider:'s3',endpoint:'https://objects.example.com',bucket:'private-cvs',region:'eu-test-1',accessKeyId:'synthetic-test-key',secretAccessKey:'synthetic-only-not-a-real-key'};
test('Current Candidate ownership gates private object and legacy reads without exposing keys or mutating records',async t=>withAuditFixture(async h=>{
 const originalFactory=storage.fromEnvironment,originalAI=ai.suggestCv,owned=[],objects=new Map();let calls=0,gate;
 const adapter=storage.createStore(config,{transport:async request=>{
  calls++;const key=new URL(request.url).pathname.split('/private-cvs/')[1],value=objects.get(key);
  if(gate)await gate();return{status:value?200:404,body:Readable.from(value?[value]:[])};
 }});storage.fromEnvironment=()=>adapter;
 await fs.mkdir(uploadsDir,{recursive:true});
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{$set:{permissions:[{resource:'candidate',action:'read',scope},{resource:'candidate',action:'update',scope}]}});
 const raw=async(actor,endpoint,init={})=>fetch(endpoint.startsWith('/uploads/')?h.apiBase.replace('/api','')+endpoint:h.apiBase+endpoint,{...init,headers:{...(h.tokens[actor]?{Authorization:'Bearer '+h.tokens[actor]}:{}),...init.headers},signal:AbortSignal.timeout(10000)});
 async function candidate(data,owner='own',ext='.docx'){
  const blob=storage.prepare(data,ext==='.pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document');objects.set(blob.key,data);
  return Candidate.create({name:'Synthetic private applicant',role:'Cashier',createdBy:h.actors[owner]._id,assignedTo:h.actors[owner==='own'?'assigned':owner]._id,departmentId:owner==='own'?'dep_A':'dep_B',cvUrl:'/uploads/'+crypto.randomUUID()+ext,privateCvBlob:blob,cvOriginal:{sha256:blob.sha256,size:blob.size},cvReview:{version:'rules-2',provider:'rule-based',processingStatus:'extracted',fields:{skills:{evidence:['Food safety'],source:'cv-text'}}}});
 }
 const bytes=docx('Name: Synthetic Applicant\nSkills: Food safety\nPhone: +994501234567'),cv=await candidate(bytes),foreign=await candidate(docx('FOREIGN_PRIVATE_TEXT'),'foreign');
 const route=(row=cv)=>`/candidates/${row._id}/cv`,preview=(row=cv)=>`/candidates/${row._id}/cv-preview?expectedHash=${row.cvOriginal.sha256}&expectedRevision=0`;
 async function during(actor,endpoint,mutation){let entered,release;const ready=new Promise(r=>entered=r),pause=new Promise(r=>release=r);let count=0;
  gate=async()=>{if(count++===0){entered();await pause;}};
  try{const pending=h.request(actor,'GET',endpoint);await ready;await mutation();release();return await pending;}finally{release();gate=undefined;}
 }
 try{
  for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' canonical/legacy download and real DOCX extraction are scoped and private',async()=>{
   const before=await Candidate.findById(cv._id).select('+privateCvBlob').lean();
   for(const url of [route(),cv.cvUrl]){const r=await raw(actor,url);assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.match(r.headers.get('content-disposition'),/^attachment/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');}
   const p=await h.request(actor,'GET',preview());assert.equal(p.status,200);assert.match(p.data.rawText,/Food safety/);assert.equal(p.data.sha256,cv.cvOriginal.sha256);assert.equal(JSON.stringify(p.data).includes('hr/cv/'),false);assert.deepEqual(await Candidate.findById(cv._id).select('+privateCvBlob').lean(),before);
  });
  for(const actor of ['own','department','assigned','none','anonymous','foreign'])await t.test(actor+' denies a foreign blob before any object request',async()=>{
   const row=actor==='foreign'?cv:foreign,before=calls;
   for(const url of [route(row),preview(row),row.cvUrl]){const r=await raw(actor,url);assert.equal(r.status,actor==='anonymous'?401:actor==='none'?403:404);assert.equal((await r.text()).includes('FOREIGN_PRIVATE_TEXT'),false);}assert.equal(calls,before);
  });
  await t.test('default model/list/detail/new-document JSON hide storage keys; client create/update cannot set them',async()=>{
   assert.equal(cv.toJSON().privateCvBlob,undefined);assert.equal((await Candidate.findById(cv._id).lean()).privateCvBlob,undefined);
   for(const url of ['/candidates',`/candidates/${cv._id}`]){const r=await h.request('admin','GET',url);assert.equal(r.status,200);assert.equal(JSON.stringify(r.data).includes('hr/cv/'),false);assert.equal(JSON.stringify(r.data).includes('privateCvBlob'),false);}
   const r=await h.request('admin','POST','/candidates',{name:'Client forged blob',role:'Cashier',privateCvBlob:cv.privateCvBlob.toObject()});assert.equal(r.status,201);assert.equal((await Candidate.findById(r.data._id).select('+privateCvBlob').lean()).privateCvBlob,undefined);
   const before=(await Candidate.findById(cv._id).select('+privateCvBlob').lean()).privateCvBlob;
   assert.equal((await h.request('admin','PUT',`/candidates/${cv._id}`,{privateCvBlob:foreign.privateCvBlob.toObject()})).status,200);assert.deepEqual((await Candidate.findById(cv._id).select('+privateCvBlob').lean()).privateCvBlob,before);
  });
  // A prior legal edit changes revision; read without a caller revision from here.
  await t.test('same JWT loses assignment during object I/O before download/preview output',async()=>{
   for(const endpoint of [route(),`/candidates/${cv._id}/cv-preview`]){const r=await during('assigned',endpoint,()=>Candidate.updateOne({_id:cv._id},{assignedTo:h.actors.foreign._id}));assert.equal(r.status,404);assert.equal(r.data.rawText,undefined);await Candidate.updateOne({_id:cv._id},{assignedTo:h.actors.assigned._id});}
  });
  await t.test('department snapshot no longer matches during storage I/O',async()=>{
   const r=await during('department',route(),()=>h.models.User.updateOne({_id:h.actors.department._id},{departmentId:'dep_B'}));assert.equal(r.status,404);await h.models.User.updateOne({_id:h.actors.department._id},{departmentId:'dep_A'});
  });
  await t.test('current role/grant, inactive account and revoked token gate buffered bytes',async()=>{
   const originalPermissions=(await h.models.Role.findOne({key:'test_assigned'}).lean()).permissions;
   const denied=await during('assigned',route(),()=>h.models.Role.updateOne({key:'test_assigned'},{permissions:[]}));assert.equal(denied.status,403);await h.models.Role.updateOne({key:'test_assigned'},{permissions:originalPermissions});
   const inactive=await during('assigned',route(),()=>h.models.User.updateOne({_id:h.actors.assigned._id},{isActive:false}));assert.equal(inactive.status,403);await h.models.User.updateOne({_id:h.actors.assigned._id},{isActive:true});
   const hash=crypto.createHash('sha256').update(h.tokens.assigned).digest('hex');const revoked=await during('assigned',route(),()=>Revoked.create({tokenHash:hash,expiresAt:new Date(Date.now()+60000)}));assert.equal(revoked.status,401);await Revoked.deleteOne({tokenHash:hash});
  });
  await t.test('still-readable but changed role authority fails closed and blob replacement returns 409',async()=>{
   const changed=await during('assigned',route(),()=>h.models.User.updateOne({_id:h.actors.assigned._id},{role:'admin'}));assert.equal(changed.status,403);assert.equal(changed.data.code,'FILE_AUTHORIZATION_CHANGED');await h.models.User.updateOne({_id:h.actors.assigned._id},{role:'test_assigned'});
   const before=await Candidate.findById(cv._id).select('+privateCvBlob').lean(),next=storage.prepare(bytes,cv.privateCvBlob.mimeType);objects.set(next.key,bytes);
   const r=await during('own',route(),()=>Candidate.updateOne({_id:cv._id},{privateCvBlob:next}));assert.equal(r.status,409);assert.equal(r.data.code,'CV_CHANGED');await Candidate.updateOne({_id:cv._id},{privateCvBlob:before.privateCvBlob});
  });
  await t.test('missing/corrupt object never falls back to a local same-name file',async()=>{
   const file=path.join(uploadsDir,cv.cvUrl.split('/').pop());await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});owned.push(file);
   const blob=(await Candidate.findById(cv._id).select('+privateCvBlob').lean()).privateCvBlob;objects.delete(blob.key);assert.equal((await h.request('own','GET',route())).status,404);
   objects.set(blob.key,Buffer.alloc(bytes.length,1));const r=await h.request('own','GET',route());assert.equal(r.status,409);assert.equal(r.data.code,'CV_CHANGED');objects.set(blob.key,bytes);
   const factory=storage.fromEnvironment;storage.fromEnvironment=()=>{throw Object.assign(Error('SYNTHETIC_SECRET'),{code:'STORAGE_NOT_CONFIGURED'});};try{const unavailable=await h.request('own','GET',route());assert.equal(unavailable.status,503);assert.equal(JSON.stringify(unavailable.data).includes('SYNTHETIC_SECRET'),false);}finally{storage.fromEnvironment=factory;}
  });
  await t.test('malformed metadata and original identity mismatch fail before provider I/O',async()=>{
   const before=await Candidate.findById(cv._id).select('+privateCvBlob').lean(),count=calls;
   await Candidate.collection.updateOne({_id:cv._id},{$set:{'privateCvBlob.key':'../foreign'}});assert.equal((await h.request('own','GET',route())).status,503);assert.equal(calls,count);
   await Candidate.updateOne({_id:cv._id},{privateCvBlob:before.privateCvBlob,'cvOriginal.sha256':'0'.repeat(64)});assert.equal((await h.request('own','GET',route())).status,409);assert.equal(calls,count);await Candidate.updateOne({_id:cv._id},{'cvOriginal.sha256':before.cvOriginal.sha256});
  });
  await t.test('PDF bytes support HEAD/range/suffix/416 without leaking object references',async()=>{
   const data=await pdf('Synthetic scoped PDF'),p=await candidate(data,'own','.pdf');
   const head=await raw('own',route(p),{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('content-length'),String(data.length));
   for(const range of ['bytes=0-4','bytes=-5']){const r=await raw('own',route(p),{headers:{Range:range}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),range==='bytes=0-4'?data.subarray(0,5):data.subarray(data.length-5));}
   const invalid=await raw('own',route(p),{headers:{Range:`bytes=${data.length}-`}});assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),`bytes */${data.length}`);
  });
  await t.test('AI review verifies object source but never transmits bytes/key; assignment revoked in second source read is denied',async()=>{
   ai.suggestCv=async context=>{assert.equal(JSON.stringify(context).includes('hr/cv/'),false);assert.equal(JSON.stringify(context).includes('Synthetic private applicant'),false);return{status:'unknown',proposals:[],uncertainty:[],requiresApproval:true};};
   const current=await Candidate.findById(cv._id).lean(),body={expectedHash:current.cvOriginal.sha256,expectedRevision:current.__v||0};
   assert.equal((await h.request('admin','POST',`/candidates/${cv._id}/ai-review`,body)).status,200);
   let n=0;gate=async()=>{if(++n===2)await Candidate.updateOne({_id:cv._id},{assignedTo:h.actors.foreign._id});};
   const r=await h.request('assigned','POST',`/candidates/${cv._id}/ai-review`,body);assert.equal(r.status,404);assert.equal(r.data.proposals,undefined);gate=undefined;await Candidate.updateOne({_id:cv._id},{assignedTo:h.actors.assigned._id});
  });
  await t.test('ordinary legacy replacement clears only the current blob reference with CAS, retaining old object for recovery',async()=>{
   const original=(await Candidate.findById(cv._id).select('+privateCvBlob').lean()).privateCvBlob,replacement=docx('Name: Replacement\nSkills: Customer service');
   const form=new FormData();form.append('cv',new Blob([replacement],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),'replacement.docx');form.append('expectedRevision',String((await Candidate.findById(cv._id).lean()).__v||0));
   const r=await raw('admin',`/candidates/${cv._id}`,{method:'PUT',body:form}),data=await r.json();assert.equal(r.status,200);owned.push(path.join(uploadsDir,data.cvUrl.split('/').pop()));
   assert.equal((await Candidate.findById(cv._id).select('+privateCvBlob').lean()).privateCvBlob,undefined);assert.deepEqual(objects.get(original.key),bytes);
   assert.deepEqual((await h.request('own','GET',route())).buffer,replacement);
  });
  await t.test('legacy file assignment is rechecked after asynchronous filesystem read (AUD-110)',async()=>{
   const data=Buffer.from('%PDF-SYNTHETIC_LEGACY'),name='test-'+crypto.randomUUID()+'.pdf',file=path.join(uploadsDir,name);await fs.writeFile(file,data,{flag:'wx',mode:0o600});owned.push(file);
   const c=await Candidate.create({name:'Synthetic legacy',role:'Cashier',assignedTo:h.actors.assigned._id,cvUrl:'/uploads/'+name});const realpath=fs.realpath;let entered,release,gated=false;const ready=new Promise(r=>entered=r),pause=new Promise(r=>release=r);
   fs.realpath=async function(...args){const result=await realpath.apply(this,args);if(args[0]===uploadsDir&&!gated){gated=true;entered();await pause;}return result;};
   try{const pending=h.request('assigned','GET',route(c));await ready;await Candidate.updateOne({_id:c._id},{assignedTo:h.actors.foreign._id});release();assert.equal((await pending).status,404);}finally{release();fs.realpath=realpath;}
  });
 }finally{gate=undefined;storage.fromEnvironment=originalFactory;ai.suggestCv=originalAI;for(const file of owned)await fs.unlink(file);}
}));
