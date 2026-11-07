const assert=require('node:assert/strict'),crypto=require('node:crypto');
const storage=require('../../services/hrPrivateObjectStorage.service'),documents=require('../../tests/helpers/cvDocuments.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function run(provider){
 const store=storage.createStore(provider.config,{transport:provider.transport}),tests=[],owned=new Map();
 async function wire(method,ref,bytes){const r=await provider.transport({...storage.protocol.sign(provider.config,method,ref,new Date(),bytes),signal:AbortSignal.timeout(8000)});let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>65536){r.body.destroy();throw Error('QA_RESPONSE_LIMIT');}}return r.status;}
 const empty=Buffer.alloc(0);assert.ok([200,204].includes(await wire('PUT',{key:'',mimeType:'application/xml',sha256:sha(empty)},empty)));
 for(const [kind,mime,bytes]of[['pdf','application/pdf',await documents.pdf('Synthetic storage acceptance only')],['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',documents.docx('Synthetic storage acceptance only')]]){
  const ref=storage.prepare(bytes,mime);await assert.rejects(store.get(ref),{code:'STORAGE_NOT_FOUND'});await store.put(ref,bytes);owned.set(ref.key,{ref,bytes:Buffer.from(bytes)});
  assert.deepEqual(await store.get(ref),bytes);await assert.rejects(store.put(ref,bytes),{code:'STORAGE_WRITE_CONFLICT'});
  const unsigned=await provider.transport({url:provider.config.endpoint+'/'+provider.config.bucket+'/'+ref.key,method:'GET',signal:AbortSignal.timeout(8000)});unsigned.body.destroy();assert.ok([403,404].includes(unsigned.status));tests.push(kind+'_conditional_private_read');
  assert.ok([200,204].includes(await wire('DELETE',ref)));await assert.rejects(store.get(ref),{code:'STORAGE_NOT_FOUND'});await store.put(ref,bytes);assert.deepEqual(await store.get(ref),bytes);tests.push(kind+'_real_delete_backup_restore');
 }
 return{store,owned,wire,tests};
}
module.exports={run};
