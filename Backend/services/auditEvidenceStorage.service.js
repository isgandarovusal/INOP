const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const {MAX_BYTES,types}=require('./uploadContent.service');
const {uploadsDir}=require('../middleware/privateUpload.middleware');
const factories=new Map();
let active=0;
const error=(code,status=503)=>Object.assign(new Error('Private audit storage is unavailable.'),{code,status});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const uuid='[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}';
const localKey=new RegExp('^'+uuid+'\\.(pdf|docx|xlsx|doc|xls|txt|csv|png|jpg|jpeg|gif|webp)$');
const objectKey=new RegExp('^audit/evidence/[a-f0-9]{24}/'+uuid+'$');
function reference(value,auditId){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length!==6||!['provider','key','sha256','size','mimeType','version'].every(key=>Object.hasOwn(value,key))||
  typeof value.provider!=='string'||typeof value.key!=='string'||typeof value.sha256!=='string'||typeof value.mimeType!=='string'||!/^[a-z][a-z0-9-]{0,40}$/.test(value.provider)||!(value.provider==='local'?localKey:objectKey).test(value.key)||
  !/^[a-f0-9]{64}$/.test(value.sha256)||!Number.isInteger(value.size)||value.size<1||value.size>MAX_BYTES||!Object.values(types).includes(value.mimeType)||
  typeof value.version!=='string'||value.version.length<1||value.version.length>128||Array.from(value.version).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))throw error('AUDIT_STORAGE_INVALID_REFERENCE',400);
 if(auditId&&value.provider!=='local'&&!value.key.startsWith(`audit/evidence/${auditId}/`))throw error('AUDIT_STORAGE_OWNERSHIP_MISMATCH',403);
 return Object.freeze({...value});
}
function prepare(bytes,mimeType,auditId,provider='local',filename=''){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MAX_BYTES||!Object.values(types).includes(mimeType)||!/^[a-f0-9]{24}$/.test(String(auditId)))throw error('AUDIT_STORAGE_INVALID_INPUT',400);
 const extension=path.extname(filename).toLowerCase();
 if(provider==='local'&&types[extension]!==mimeType)throw error('AUDIT_STORAGE_INVALID_INPUT',400);
 return {provider,key:provider==='local'?crypto.randomUUID()+extension:`audit/evidence/${auditId}/${crypto.randomUUID()}`,size:bytes.length,sha256:hash(bytes),mimeType};
}
async function bounded(value,ref){
 const chunks=[];let size=0;
 for await(const chunk of Buffer.isBuffer(value)?[value]:value){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>ref.size||size>MAX_BYTES)throw error('AUDIT_STORAGE_IDENTITY_MISMATCH',409);chunks.push(bytes);}
 const bytes=Buffer.concat(chunks,size);if(size!==ref.size||hash(bytes)!==ref.sha256)throw error('AUDIT_STORAGE_IDENTITY_MISMATCH',409);return bytes;
}
function localStore(){return Object.freeze({
 provider:'local',durable:false,
 async put(input,bytes){const ref=reference({...input,version:'1'});const snapshot=Buffer.from(bytes);if(snapshot.length!==ref.size||hash(snapshot)!==ref.sha256)throw error('AUDIT_STORAGE_IDENTITY_MISMATCH',409);await fs.mkdir(uploadsDir,{recursive:true});await fs.writeFile(path.join(uploadsDir,ref.key),snapshot,{flag:'wx',mode:0o600});return ref;},
 async get(value){const ref=reference(value);try{const bytes=await require('../controllers/privateFiles.controller').readBoundedPrivateFile(ref.key);if(!bytes)throw error('AUDIT_STORAGE_NOT_FOUND',404);return bounded(bytes,ref);}catch(failure){if(['ENOENT','ENOTDIR','ELOOP'].includes(failure.code))throw error('AUDIT_STORAGE_NOT_FOUND',404);throw failure;}},
 async remove(value){const ref=reference(value);try{await fs.unlink(path.join(uploadsDir,ref.key));}catch(failure){if(failure.code!=='ENOENT')throw error('AUDIT_STORAGE_CLEANUP_FAILED');}},
 });}
function createPrivateStore(adapter,{timeoutMs=8000}={}){
 if(!adapter||typeof adapter.id!=='string'||adapter.id==='local'||!/^[a-z][a-z0-9-]{0,40}$/.test(adapter.id)||!['durable','private','versioned','conditionalWrites'].every(key=>adapter.capabilities?.[key]===true)||!['put','get','remove'].every(key=>typeof adapter[key]==='function')||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>8000)throw error('AUDIT_STORAGE_INVALID_ADAPTER');
 async function operation(work){
  if(active>=2)throw error('AUDIT_STORAGE_BUSY');
  active++;let timer;const controller=new AbortController();
  const pending=Promise.resolve().then(()=>work(controller.signal));
  // A timed-out caller is not proof that provider work stopped. Retain its slot
  // until settlement, including stream reads, even if the adapter ignores abort.
  pending.then(()=>{active--;},()=>{active--;});
  try{return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(error('AUDIT_STORAGE_TIMEOUT'));},timeoutMs);})]);}
  catch(failure){if(failure.code?.startsWith('AUDIT_STORAGE_'))throw failure;throw error('AUDIT_STORAGE_PROVIDER_FAILURE');}
  finally{clearTimeout(timer);}
 }
 const get=(value)=>operation(async signal=>{const ref=reference(value);if(ref.provider!==adapter.id)throw error('AUDIT_STORAGE_INVALID_REFERENCE',400);return bounded(await adapter.get({key:ref.key,version:ref.version,signal}),ref);});
 return Object.freeze({provider:adapter.id,durable:true,get,
  put:async(input,bytes)=>{
   reference({...input,version:'pending'});const snapshot=Buffer.from(bytes);if(input.provider!==adapter.id||snapshot.length!==input.size||hash(snapshot)!==input.sha256)throw error('AUDIT_STORAGE_IDENTITY_MISMATCH',409);
   const receipt=await operation(signal=>adapter.put({key:input.key,bytes:snapshot,mimeType:input.mimeType,sha256:input.sha256,ifAbsent:true,signal}));
   if(!receipt||typeof receipt!=='object'||typeof receipt.version!=='string'||!receipt.version||receipt.version.length>128||Array.from(receipt.version).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127))throw error('AUDIT_STORAGE_INVALID_RECEIPT');
   const ref=reference({...input,version:receipt.version});if(receipt.private!==true)throw error('AUDIT_STORAGE_NOT_PRIVATE');await get(ref);return ref;
  },
  remove:value=>operation(signal=>{const ref=reference(value);if(ref.provider!==adapter.id)throw error('AUDIT_STORAGE_INVALID_REFERENCE',400);return adapter.remove({key:ref.key,version:ref.version,signal});}),
 });
}
// Server bootstrap only: no provider is registered/enabled by this release.
function registerProvider(id,factory){if(typeof id!=='string'||id==='local'||!/^[a-z][a-z0-9-]{0,40}$/.test(id)||typeof factory!=='function'||factories.has(id))throw error('AUDIT_STORAGE_INVALID_ADAPTER');factories.set(id,factory);}
function fromEnvironment(env=process.env){
 const production=env.RENDER==='true'||env.NODE_ENV==='production';
 if(env.AUDIT_EVIDENCE_STORAGE_PROVIDER){if(env.AUDIT_EVIDENCE_STORAGE_ENABLED!=='true'||!factories.has(env.AUDIT_EVIDENCE_STORAGE_PROVIDER))throw error('AUDIT_STORAGE_NOT_CONFIGURED');const adapter=factories.get(env.AUDIT_EVIDENCE_STORAGE_PROVIDER)(env);if(adapter.credentialsReady!==true)throw error('AUDIT_STORAGE_NOT_CONFIGURED');return createPrivateStore(adapter);}
 if(production)throw error('AUDIT_STORAGE_NOT_CONFIGURED');return localStore();
}
function forReference(value,auditId,env=process.env){const ref=reference(value,auditId);if(ref.provider==='local')return localStore();const store=fromEnvironment(env);if(store.provider!==ref.provider)throw error('AUDIT_STORAGE_NOT_CONFIGURED');return store;}
module.exports={prepare,reference,createPrivateStore,registerProvider,fromEnvironment,forReference,MAX_BYTES};
