const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('../services/auditEvidenceStorage.service');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const auditId='0123456789abcdef01234567',bytes=Buffer.from('%PDF-1.4\nSynthetic only\n%%EOF');
function adapter(){const values=new Map();return{id:'qa-private',capabilities:{durable:true,private:true,versioned:true,conditionalWrites:true},values,async put({key,bytes,ifAbsent}){assert.equal(ifAbsent,true);if(values.has(key))throw Error('conflict');values.set(key,Buffer.from(bytes));return{version:'v1',private:true};},async get({key,version}){assert.equal(version,'v1');return values.get(key);},async remove({key,version}){assert.equal(version,'v1');values.delete(key);}};}
test('Private adapter enforces bounded immutable references, identity, custody and cleanup',async()=>{
 const raw=adapter(),store=storage.createPrivateStore(raw),input=storage.prepare(bytes,'application/pdf',auditId,raw.id);
 const ref=await store.put(input,bytes);assert.equal(raw.values.size,1);assert.deepEqual(await store.get(ref),bytes);
 assert.throws(()=>storage.reference(ref,'ffffffffffffffffffffffff'),{code:'AUDIT_STORAGE_OWNERSHIP_MISMATCH'});
 for(const bad of[{...ref,key:'../../secret'},{...ref,size:storage.MAX_BYTES+1},{...ref,key:[ref.key]},{...ref,publicUrl:'https://example.invalid'}])assert.throws(()=>storage.reference(bad),{code:'AUDIT_STORAGE_INVALID_REFERENCE'});
 await assert.rejects(()=>store.put({...input,key:'../../secret'},bytes),{code:'AUDIT_STORAGE_INVALID_REFERENCE'});
 raw.values.set(ref.key,Buffer.from('tampered'));await assert.rejects(()=>store.get(ref),{code:'AUDIT_STORAGE_IDENTITY_MISMATCH'});
 await store.remove(ref);assert.equal(raw.values.size,0);
 assert.throws(()=>storage.createPrivateStore({...adapter(),capabilities:{durable:true,private:false}}),{code:'AUDIT_STORAGE_INVALID_ADAPTER'});
 assert.throws(()=>storage.fromEnvironment({RENDER:'true'}),{code:'AUDIT_STORAGE_NOT_CONFIGURED'});
 storage.registerProvider('qa-disabled',()=>adapter());assert.throws(()=>storage.fromEnvironment({RENDER:'true',AUDIT_EVIDENCE_STORAGE_PROVIDER:'qa-disabled',AUDIT_EVIDENCE_STORAGE_ENABLED:'true'}),{code:'AUDIT_STORAGE_NOT_CONFIGURED'});

 assert.throws(()=>storage.fromEnvironment({NODE_ENV:'production',AUDIT_EVIDENCE_STORAGE_PROVIDER:'unapproved',AUDIT_EVIDENCE_STORAGE_ENABLED:'true'}),{code:'AUDIT_STORAGE_NOT_CONFIGURED'});
 const failure=adapter();failure.get=async()=>{throw Error('Sensitive provider credential');};await assert.rejects(()=>storage.createPrivateStore(failure).get(ref),error=>!error.message.includes('Sensitive')&&error.code==='AUDIT_STORAGE_PROVIDER_FAILURE');
 const slow=adapter();slow.get=async({signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));await assert.rejects(()=>storage.createPrivateStore(slow,{timeoutMs:10}).get(ref),{code:'AUDIT_STORAGE_TIMEOUT'});
});
test('Evidence routes preserve permissions, local private bytes, metadata and production 503',async()=>withAuditFixture(async h=>{
 const audit=await h.audit('auditor','service');const Evidence=require('../models/auditEvidence.model');
 const upload=async(actor,payload=bytes,mime='application/pdf',name='synthetic.pdf')=>{const form=new FormData();form.set('file',new Blob([payload],{type:mime}),name);form.set('uploadedBy','forged');form.set('storageKey','../../secret');const response=await fetch(h.apiBase+'/audit-evidence/'+audit.id,{method:'POST',headers:{Authorization:'Bearer '+h.tokens[actor]},body:form});return{status:response.status,data:await response.json()};};
 const count=await Evidence.countDocuments();assert.equal((await upload('hr')).status,403);assert.equal((await upload('admin',Buffer.from('not PDF'))).status,400);assert.equal((await upload('admin',Buffer.alloc(storage.MAX_BYTES+1))).status,413);assert.equal(await Evidence.countDocuments(),count);
 const old=process.env.RENDER;process.env.RENDER='true';try{assert.equal((await upload('admin')).status,503);}finally{if(old===undefined)delete process.env.RENDER;else process.env.RENDER=old;}
 const created=await upload('admin');assert.equal(created.status,201);const row=await Evidence.findById(created.data.data.id).lean();
 try{
  assert.equal(row.uploadedBy,String(h.actors.admin._id));assert.equal(row.storageReference.provider,'local');assert.equal(row.storageReference.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));assert.equal(created.data.data.storageReference,undefined);
  const read=await h.request('admin','GET',`/audit-evidence/${row._id}/file`);assert.equal(read.status,200);assert.deepEqual(read.buffer,bytes);assert.equal(read.headers['cache-control'],'private, no-store');
  assert.equal((await h.request('hr','GET',`/audit-evidence/${row._id}/file`)).status,403);
  const files=require('../controllers/privateFiles.controller'),originalRead=files.readBoundedPrivateFile;files.readBoundedPrivateFile=async key=>{const result=await originalRead(key);await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{role:'hr_manager'}});return result;};
  try{assert.equal((await h.request('admin','GET',`/audit-evidence/${row._id}/file`)).status,403);}finally{files.readBoundedPrivateFile=originalRead;await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{role:'admin'}});}

  await require('node:fs/promises').writeFile(require('node:path').join(require('../middleware/privateUpload.middleware').uploadsDir,row.storageKey),'tampered');assert.equal((await h.request('admin','GET',`/audit-evidence/${row._id}/file`)).status,409);
 }finally{await storage.forReference(row.storageReference,String(audit._id)).remove(row.storageReference);}
}));
test('Release dry-run detects conflicts and mappings without mutating input or opening a DB',async()=>{
 const {analyze}=require('../services/auditReleasePlan.service');const snapshot={topology:{setName:'synthetic-only'},users:[{_id:auditId,role:'auditor'}],restaurants:[{id:'r',name:'KFC synthetic',organizationId:'gfc',brandId:'kfc'}],profiles:[{_id:auditId,organizationId:'gfc',direction:'service',active:true,version:0,history:[{to:'service',actorId:auditId,reason:'Synthetic fixture',changedAt:'2026-10-14'}]}],templates:[],revisions:[],contexts:[],assignments:[],executions:[],audits:[],evidence:[]};const before=JSON.stringify(snapshot);assert.equal(analyze(snapshot).readyForReviewedMigration,true);assert.equal(JSON.stringify(snapshot),before);snapshot.profiles.push({...snapshot.profiles[0],role:'audit_manager'});snapshot.restaurants.push({id:'unknown',brandId:'gfc'});const report=analyze(snapshot);assert.equal(report.writes,0);assert.equal(report.productionVerified,false);assert.ok(report.issues.some(row=>row.reason.includes('Duplicate')));assert.ok(report.issues.some(row=>row.reason.includes('promotion')));
 const fs=require('node:fs/promises'),path=require('node:path');const dir=await fs.mkdtemp('/tmp/inop-release-dry-');const file=path.join(dir,'snapshot.json');await fs.writeFile(file,before);const out=require('node:child_process').spawnSync(process.execPath,['Backend/scripts/auditReleaseDryRun.cjs','--snapshot',file],{cwd:'/workspace/INOP',encoding:'utf8'});assert.equal(out.status,0);assert.equal(JSON.parse(out.stdout).mode,'offline-dry-run');assert.equal(await fs.readFile(file,'utf8'),before);
});
