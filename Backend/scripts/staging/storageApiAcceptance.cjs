const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('../../tests/helpers/auditFixture.cjs');
const Candidate=require('../../models/candidate.model'),storage=require('../../services/hrPrivateObjectStorage.service');
async function run(provider,result){
 await withAuditFixture(async h=>{
  const original=storage.fromEnvironment;storage.fromEnvironment=()=>result.store;
  await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[{resource:'candidate',action:'read',scope:'own'}]}});
  try{
   for(const {ref,bytes}of result.owned.values()){
    const row=await Candidate.create({name:'Synthetic restore applicant',role:'Cashier',createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A',cvUrl:'/uploads/'+crypto.randomUUID()+(ref.mimeType==='application/pdf'?'.pdf':'.docx'),privateCvBlob:ref,cvOriginal:{sha256:ref.sha256,size:ref.size}});
    const route=`/candidates/${row._id}/cv`,before=await Candidate.findById(row._id).select('+privateCvBlob').lean();
    const read=()=>h.request('own','GET',route);
    let response=await read();assert.equal(response.status,200);assert.deepEqual(response.buffer,bytes);assert.equal(response.headers['cache-control'],'private, no-store');
    assert.equal((await h.request('anonymous','GET',route)).status,401);assert.equal((await h.request('foreign','GET',route)).status,404);result.tests.push('real_api_owner_read_and_cross_department_denial');
    assert.ok([200,204].includes(await result.wire('DELETE',ref)));assert.equal((await read()).status,404);await result.store.put(ref,bytes);assert.deepEqual((await read()).buffer,bytes);assert.deepEqual(await Candidate.findById(row._id).select('+privateCvBlob').lean(),before);result.tests.push('real_api_restore_same_bytes_revision_and_linkage');
   }
   const {ref,bytes}=result.owned.values().next().value,row=await Candidate.findOne({'cvOriginal.sha256':ref.sha256}),route=`/candidates/${row._id}/cv`;
   await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:false}});assert.equal((await h.request('own','GET',route)).status,403);await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:true}});result.tests.push('revoked_user_denial');
   let entered,release;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
   storage.fromEnvironment=()=>({get:async(...args)=>{entered();await gate;return result.store.get(...args);}});
   try{const pending=h.request('own','GET',route);await Promise.race([ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('QA_GATE_TIMEOUT')),5000).unref())]);await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:false}});release();assert.equal((await pending).status,403);}finally{release();storage.fromEnvironment=()=>result.store;await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:true}});}
   result.tests.push('revocation_during_real_provider_read');
   const corrupt=Buffer.from('Synthetic corrupted replacement'),changed={...ref,sha256:crypto.createHash('sha256').update(corrupt).digest('hex'),size:corrupt.length};
   assert.ok([200,204].includes(await result.wire('DELETE',ref)));assert.ok([200,204].includes(await result.wire('PUT',changed,corrupt)));assert.equal((await h.request('own','GET',route)).status,409);assert.ok([200,204].includes(await result.wire('DELETE',ref)));await result.store.put(ref,bytes);assert.deepEqual((await h.request('own','GET',route)).buffer,bytes);result.tests.push('real_corrupt_object_rejected_then_restored');
   await provider.stop();await assert.rejects(result.store.get(ref),{code:'STORAGE_UNAVAILABLE'});await provider.restart();assert.deepEqual(await result.store.get(ref),bytes);result.tests.push('real_provider_outage_restart_recovery');
   result.mongoVersion=(await h.mongoose.connection.db.admin().serverStatus()).version;
  }finally{storage.fromEnvironment=original;}
 });
}
module.exports={run};
