const {test}=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{create,submit,upload}=require('./helpers/reportFixture.cjs');
const {env,harness,pdf}=require('./helpers/auditS3Protocol.cjs');
test('Bootstrapped S3 protocol serves six report families and three private slots through real authorized APIs without production credentials',async()=>withAuditFixture(async h=>{
 const protocol=harness(),storage=require('../services/auditEvidenceStorage.service'),{createAdapter}=require('../services/auditS3Adapter.service');
 require('../services/auditStorageBootstrap.service').initialize({createAdapter:e=>createAdapter(e,{transport:protocol.transport})});
 const keys=[...Object.keys(env),'NODE_ENV'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  Object.assign(process.env,env,{NODE_ENV:'production'});
  for(const[kind,target]of[['hr','kfc'],['service','kfc'],['standard','kfc'],['hse','restaurant'],['hse','office'],['hse','warehouse']]){
   const row=await create(h,kind,target,true),ids=[];for(let i=0;i<3;i++)ids.push(await upload(h,row.audit._id,`synthetic-${i}.pdf`,pdf,'application/pdf'));
   assert.equal(new Set(ids).size,3);row.details.finalEvidence={documentIds:ids};await submit(h,row);
   const report=await h.request('admin','GET',`/audit-report/${row.audit._id}`);assert.equal(report.status,200);assert.deepEqual(report.data.data.bundle.finalEvidence.documentIds,ids);
   for(const id of ids){const e=await require('../models/auditEvidence.model').findById(id).lean();assert.equal(e.storageReference.provider,'s3');assert.ok(e.storageReference.key.startsWith(`audit/evidence/${row.audit._id}/`));const r=await h.request('admin','GET',`/audit-evidence/${id}/file`);assert.equal(r.status,200);assert.deepEqual(r.buffer,pdf);assert.equal((await h.request('foreign','GET',`/audit-evidence/${id}/file`)).status,403);if(kind!=='service')assert.equal((await h.request('auditor','GET',`/audit-evidence/${id}/file`)).status,403);}
   const excel=await h.request('admin','GET',`/audit-export/${row.audit._id}/excel`);assert.equal(excel.status,200);assert.equal(excel.buffer.subarray(0,2).toString(),'PK');
  }
  const e=await require('../models/auditEvidence.model').findOne().lean();assert.throws(()=>storage.forReference(e.storageReference,'ffffffffffffffffffffffff'),{code:'AUDIT_STORAGE_OWNERSHIP_MISMATCH'});
  await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{isActive:false}});const revoked=await h.request('admin','GET',`/audit-evidence/${e._id}/file`);assert.equal(revoked.status,403);assert.notDeepEqual(revoked.buffer,pdf);await h.models.User.updateOne({_id:h.actors.admin._id},{$set:{isActive:true}});
  protocol.setPolicy('<PublicAccessBlockConfiguration/>');assert.equal((await h.request('admin','GET',`/audit-evidence/${e._id}/file`)).status,503);
 }finally{for(const key of keys)if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];protocol.objects.clear();}
}));
