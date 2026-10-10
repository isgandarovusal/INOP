const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs/promises'),path=require('node:path');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx,pdf}=require('./helpers/cvDocuments.cjs');
const Candidate=require('../models/candidate.model'),{uploadsDir}=require('../middleware/privateUpload.middleware');
const {pool}=require('../services/documentWorkerPool.service');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Original CV preview preserves independent current read scope, file identity and bounded extraction',async t=>withAuditFixture(async h=>{
 const owned=[];await fs.mkdir(uploadsDir,{recursive:true});
 async function file(bytes,ext='.docx'){const name='test-'+crypto.randomUUID()+ext;const target=path.join(uploadsDir,name);await fs.writeFile(target,bytes,{flag:'wx'});owned.push(target);return '/uploads/'+name;}
 const bytes=docx('Name: Private Original\nPhone: +994501234567\n<script>untrusted</script>');
 const cv=await Candidate.create({name:'Private Original',role:'Cashier',createdBy:h.actors.own._id,departmentId:'dep_A',assignedTo:h.actors.assigned._id,cvUrl:await file(bytes)});
 const foreign=await Candidate.create({name:'Foreign',role:'Cashier',createdBy:h.actors.foreign._id,departmentId:'dep_B',assignedTo:h.actors.foreign._id,cvUrl:await file(docx('Private Foreign'))});
 const route=(id=cv._id,hash=digest(bytes),revision=0)=>`/candidates/${id}/cv-preview?expectedHash=${hash}&expectedRevision=${revision}`;
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{$set:{permissions:[{resource:'candidate',action:'read',scope}]}});
 async function duringExtraction(actor,mutation){const original=pool.run;let release,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  pool.run=async function(...args){const result=await original.apply(this,args);if(args[0]==='extract'){entered();await gate;}return result;};
  try{const pending=h.request(actor,'GET',route());await ready;await mutation();release();return await pending;}finally{release();pool.run=original;}
 }
 try{
  for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' legal original preview does not require create permission',async()=>{
   const r=await h.request(actor,'GET',route());assert.equal(r.status,200);assert.match(r.data.rawText,/Private Original/);assert.match(r.data.rawText,/<script>/);assert.equal(r.data.sha256,digest(bytes));assert.deepEqual(r.data.warnings,[]);assert.equal(r.headers['cache-control'],'private, no-store');assert.ok(!JSON.stringify(r.data).includes('/uploads/'));
  });
  for(const actor of ['own','department','assigned','none','anonymous','foreign'])await t.test(actor+' cannot read unauthorized original text',async()=>{
   const r=await h.request(actor,'GET',route(actor==='foreign'?cv._id:foreign._id));assert.equal(r.status,actor==='anonymous'?401:actor==='none'?403:404);assert.ok(!JSON.stringify(r.data).includes('Private Foreign'));
  });
  await t.test('malformed identity, missing record and wrong hash/revision are distinct',async()=>{
   assert.equal((await h.request('admin','GET','/candidates/not-an-id/cv-preview')).status,400);
   assert.equal((await h.request('admin','GET',route(new h.mongoose.Types.ObjectId()))).status,404);
   assert.equal((await h.request('own','GET',`/candidates/${cv._id}/cv-preview?expectedHash=invalid`)).status,400);
   for(const url of [route(cv._id,'0'.repeat(64)),route(cv._id,digest(bytes),10)]){const r=await h.request('own','GET',url);assert.equal(r.status,409);assert.equal(r.data.code,'CV_CHANGED');assert.equal(r.data.rawText,undefined);}
  });
  await t.test('legacy missing stored SHA can use actual bytes, without a DB write',async()=>{
   const before=await Candidate.findById(cv._id).lean();assert.equal(before.cvOriginal?.sha256,undefined);
   assert.equal((await h.request('own','GET',`/candidates/${cv._id}/cv-preview`)).status,200);assert.deepEqual(await Candidate.findById(cv._id).lean(),before);
  });
  await t.test('assignment revoked while extraction runs is fail closed',async()=>{
   const r=await duringExtraction('assigned',()=>Candidate.updateOne({_id:cv._id},{$set:{assignedTo:h.actors.foreign._id}}));assert.equal(r.status,404);assert.equal(r.data.rawText,undefined);
   await Candidate.updateOne({_id:cv._id},{$set:{assignedTo:h.actors.assigned._id}});
  });
  await t.test('same JWT role/permission revocation during extraction denies the result',async()=>{
   const r=await duringExtraction('assigned',()=>h.models.Role.updateOne({key:'test_assigned'},{$set:{permissions:[{resource:'candidate',action:'read',scope:'none'}]}}));assert.equal(r.status,403);assert.equal(r.data.rawText,undefined);
   await h.models.Role.updateOne({key:'test_assigned'},{$set:{permissions:[{resource:'candidate',action:'read',scope:'assigned'}]}});
  });
  await t.test('current department and inactive account changes also apply before preview delivery',async()=>{
   const denied=await duringExtraction('department',()=>h.models.User.updateOne({_id:h.actors.department._id},{$set:{departmentId:'dep_B'}}));assert.equal(denied.status,404);assert.equal(denied.data.rawText,undefined);
   await h.models.User.updateOne({_id:h.actors.department._id},{$set:{departmentId:'dep_A'}});
   const inactive=await duringExtraction('assigned',()=>h.models.User.updateOne({_id:h.actors.assigned._id},{$set:{isActive:false}}));assert.equal(inactive.status,403);assert.equal(inactive.data.rawText,undefined);
   await h.models.User.updateOne({_id:h.actors.assigned._id},{$set:{isActive:true}});
  });
  await t.test('busy preview queue is retryable 503 without disclosing original text',async()=>{
   const signal=new AbortController(),pending=Array.from({length:9},()=>pool.run('extract',bytes,'cv.docx',{signal:signal.signal})),settled=Promise.allSettled(pending);
   try{const r=await h.request('own','GET',route());assert.equal(r.status,503);assert.equal(r.data.code,'DOCUMENT_BUSY');assert.equal(r.data.rawText,undefined);}finally{signal.abort();await settled;}
  });
  await t.test('JWT revoked during extraction cannot use its earlier authorization',async()=>{
   const RevokedToken=require('../models/revokedToken.model'),tokenHash=digest(Buffer.from(h.tokens.assigned));
   const r=await duringExtraction('assigned',()=>RevokedToken.create({tokenHash,expiresAt:new Date(Date.now()+3600000)}));assert.equal(r.status,401);assert.equal(r.data.rawText,undefined);await RevokedToken.deleteOne({tokenHash});
  });
  await t.test('replacement during extraction returns conflict instead of text for an obsolete file',async()=>{
   const old=cv.cvUrl,next=await file(docx('Name: New Original'));
   const r=await duringExtraction('own',()=>Candidate.updateOne({_id:cv._id},{$set:{cvUrl:next},$inc:{__v:1}}));assert.equal(r.status,409);assert.equal(r.data.code,'CV_CHANGED');assert.equal(r.data.rawText,undefined);
   await Candidate.updateOne({_id:cv._id},{$set:{cvUrl:old,__v:0}});
  });
  await t.test('traversal, symlink and a missing original remain closed',async()=>{
   for(const cvUrl of ['/uploads/../server.js','/uploads/.env','/uploads/missing.docx']){const c=await Candidate.create({name:'Unsafe path',role:'Cashier',cvUrl});assert.equal((await h.request('admin','GET',`/candidates/${c._id}/cv-preview`)).status,404);}
   const name='test-'+crypto.randomUUID()+'.docx',target=path.join(uploadsDir,name);await fs.symlink(owned[0],target);owned.push(target);
   const c=await Candidate.create({name:'Symlink',role:'Cashier',cvUrl:'/uploads/'+name});assert.equal((await h.request('admin','GET',`/candidates/${c._id}/cv-preview`)).status,404);
  });
  await t.test('oversize and malformed input reject, partial extraction warns, scan requires OCR',async()=>{
   for(const [data,ext,status,code] of [[Buffer.alloc(5*1024*1024+1),'.pdf',422,'EXTRACTION_FAILED'],[Buffer.from('%PDF-broken'),'.pdf',422,'EXTRACTION_FAILED'],[await pdf(''),'.pdf',422,'OCR_REQUIRED']]){
    const c=await Candidate.create({name:'Synthetic document',role:'Cashier',cvUrl:await file(data,ext)}),r=await h.request('admin','GET',`/candidates/${c._id}/cv-preview`);assert.equal(r.status,status);assert.equal(r.data.code,code);assert.equal(r.data.rawText,undefined);
   }
   const c=await Candidate.create({name:'Partial',role:'Cashier',cvUrl:await file(docx('A'.repeat(150000)))}),r=await h.request('admin','GET',`/candidates/${c._id}/cv-preview`);assert.equal(r.status,200);assert.equal(r.data.rawText.length,100000);assert.deepEqual(r.data.warnings,['text_limit']);
  });
 }finally{for(const file of owned)await fs.unlink(file);}
}));
