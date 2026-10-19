const{test}=require('node:test'),assert=require('node:assert/strict');const storage=require('../services/auditEvidenceStorage.service'),{withAuditFixture}=require('./helpers/auditFixture.cjs'),{create,submit,upload}=require('./helpers/reportFixture.cjs');
const pdf=Buffer.from('%PDF-1.4\nSynthetic isolated provider only\n%%EOF');
function provider(){const objects=new Map();return{id:'qa-p09-provider',credentialsReady:true,capabilities:{private:true,durable:true,versioned:true,conditionalWrites:true},objects,
 async put({key,bytes,ifAbsent}){assert.equal(ifAbsent,true);assert.ok(!objects.has(key));objects.set(key,Buffer.from(bytes));return{version:'v1',private:true};},async get({key,version}){assert.equal(version,'v1');return objects.get(key);},async remove({key,version}){assert.equal(version,'v1');objects.delete(key);}};}
test('Malformed provider receipts fail closed as infrastructure errors without leaking provider metadata',async()=>{
 for(const receipt of [null,undefined,{}, {version:''},{version:'secret\ninvalid'}]){const p=provider();p.put=async()=>receipt;const bytes=pdf,input=storage.prepare(bytes,'application/pdf','0123456789abcdef01234567',p.id);await assert.rejects(storage.createPrivateStore(p).put(input,bytes),e=>e.code==='AUDIT_STORAGE_INVALID_RECEIPT'&&e.status===503&&!e.message.includes('secret'));}
});
test('Isolated private production-mode provider supports all six real source reports and three independent documents, custody, denial and hash tampering',{timeout:120000},async()=>withAuditFixture(async h=>{
 const p=provider();storage.registerProvider(p.id,()=>p);const keys=['NODE_ENV','AUDIT_EVIDENCE_STORAGE_PROVIDER','AUDIT_EVIDENCE_STORAGE_ENABLED'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{process.env.NODE_ENV='production';process.env.AUDIT_EVIDENCE_STORAGE_PROVIDER=p.id;process.env.AUDIT_EVIDENCE_STORAGE_ENABLED='true';
 for(const[kind,target]of[['hr','kfc'],['service','kfc'],['standard','kfc'],['hse','restaurant'],['hse','office'],['hse','warehouse']]){
  const row=await create(h,kind,target,true),ids=[];for(let slot=0;slot<3;slot++)ids.push(await upload(h,row.audit._id,`synthetic-${slot}.pdf`,pdf,'application/pdf'));
  row.details.finalEvidence={documentIds:ids};await submit(h,row);
  const report=await h.request('admin','GET',`/audit-report/${row.audit._id}`);assert.equal(report.status,200);assert.deepEqual(report.data.data.bundle.finalEvidence.documentIds,ids);assert.equal(report.data.data.bundle.evidence.length,3);
  for(const id of ids){const stored=await require('../models/auditEvidence.model').findById(id).lean();assert.ok(stored.storageReference.key.startsWith(`audit/evidence/${row.audit._id}/`));const r=await h.request('admin','GET',`/audit-evidence/${id}/file`);assert.equal(r.status,200);assert.deepEqual(r.buffer,pdf);assert.equal(r.headers['cache-control'],'private, no-store');assert.equal((await h.request('foreign','GET',`/audit-evidence/${id}/file`)).status,403);}
  const xlsx=await h.request('admin','GET',`/audit-export/${row.audit._id}/excel`);assert.equal(xlsx.status,200);assert.equal(xlsx.buffer.subarray(0,2).toString(),'PK');
 }
 const first=await require('../models/auditEvidence.model').findOne().lean();p.objects.set(first.storageReference.key,Buffer.from('tampered'));assert.equal((await h.request('admin','GET',`/audit-evidence/${first._id}/file`)).status,409);
 process.env.AUDIT_EVIDENCE_STORAGE_ENABLED='false';assert.throws(()=>storage.fromEnvironment(),{code:'AUDIT_STORAGE_NOT_CONFIGURED'});
 }finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];p.objects.clear();}
}));
