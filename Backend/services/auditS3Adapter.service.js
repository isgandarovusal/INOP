// Optional S3-compatible protocol adapter, disabled unless explicitly configured.
// No production vendor, bucket, credentials or endpoint is selected by this code.
const {protocol}=require('./hrPrivateObjectStorage.service');
const fail=(code='AUDIT_STORAGE_NOT_CONFIGURED',status=503)=>Object.assign(new Error('Private audit storage is unavailable.'),{code,status});
const version=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)&&value!=='null';
const keyValid=key=>typeof key==='string'&&key.length===76&&/^audit\/evidence\/[a-f0-9]{24}\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(key);
function configFromEnvironment(env){
 if(env.AUDIT_EVIDENCE_STORAGE_ENABLED!=='true'||env.AUDIT_EVIDENCE_STORAGE_PROVIDER!=='s3'||env.AUDIT_EVIDENCE_STORAGE_PRIVATE_BUCKET_APPROVED!=='true')throw fail();
 try{return protocol.configValue({provider:'s3',endpoint:env.AUDIT_EVIDENCE_STORAGE_ENDPOINT,bucket:env.AUDIT_EVIDENCE_STORAGE_BUCKET,region:env.AUDIT_EVIDENCE_STORAGE_REGION,accessKeyId:env.AUDIT_EVIDENCE_STORAGE_ACCESS_KEY_ID,secretAccessKey:env.AUDIT_EVIDENCE_STORAGE_SECRET_ACCESS_KEY,...(env.AUDIT_EVIDENCE_STORAGE_SESSION_TOKEN?{sessionToken:env.AUDIT_EVIDENCE_STORAGE_SESSION_TOKEN}:{})});}catch{throw fail();}
}
async function smallBody(body,signal){let value='';for await(const chunk of body||[]){if(signal?.aborted)throw fail('AUDIT_STORAGE_TIMEOUT');value+=Buffer.from(chunk).toString('utf8');if(Buffer.byteLength(value)>8192)throw fail();}if(signal?.aborted)throw fail('AUDIT_STORAGE_TIMEOUT');if(/<!|&/.test(value))throw fail();return value;}
// S3 configuration responses contain flat scalar fields. Reject ambiguous XML,
// including nested/duplicate values, rather than treating a matching substring
// as evidence of private/versioned custody. No entities or general XML parsing.
function configurationFields(xml,root,allowed){
 const outer=new RegExp('^\\s*(?:<\\?xml[^?]*\\?>\\s*)?<'+root+'(?:\\s+xmlns=(?:"[^"<>]*"|\'[^\'<>]*\'))?\\s*>([\\s\\S]*)</'+root+'>\\s*$').exec(xml);
 if(!outer)throw fail();
 const fields=Object.create(null);let invalid=false;
 const rest=outer[1].replace(/<([A-Za-z]+)>\s*([A-Za-z]+)\s*<\/\1>/g,(_match,name,value)=>{
  if(!allowed.includes(name)||Object.hasOwn(fields,name))invalid=true;
  fields[name]=value;return '';
 });
 if(invalid||rest.trim())throw fail();
 return fields;
}
function createAdapter(env,{transport=protocol.nativeTransport,now=()=>new Date()}={}){
 const config=configFromEnvironment(env);
 async function request(method,key,signal,{query={},bytes,headers={}}={}){
  if(signal?.aborted)throw fail('AUDIT_STORAGE_TIMEOUT');
  const response=await transport({...protocol.sign(config,method,{key,mimeType:headers['content-type']||'application/octet-stream',sha256:headers['x-amz-meta-sha256']||''},now(),bytes,{query,headers}),signal});
  if(!response||signal?.aborted)throw fail('AUDIT_STORAGE_TIMEOUT');
  if([409,412].includes(response.status)){response.body?.destroy?.();throw fail('AUDIT_STORAGE_WRITE_CONFLICT',409);}
  if(response.status===404){response.body?.destroy?.();throw fail('AUDIT_STORAGE_NOT_FOUND',404);}
  if(![200,204].includes(response.status)){response.body?.destroy?.();throw fail();}
  return response;
 }
 async function verifyBucket(signal){
  // Never trust an environment flag alone as proof of private/versioned custody.
  const policy=await request('GET','',signal,{query:{publicAccessBlock:''}}),xml=await smallBody(policy.body,signal);
  const names=['BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets'];
  const flags=configurationFields(xml,'PublicAccessBlockConfiguration',names);
  for(const name of names)if(flags[name]!=='true')throw fail('AUDIT_STORAGE_NOT_PRIVATE');
  const state=await request('GET','',signal,{query:{versioning:''}}),v=await smallBody(state.body,signal);
  const stateFields=configurationFields(v,'VersioningConfiguration',['Status','MfaDelete']);
  if(stateFields.Status!=='Enabled'||stateFields.MfaDelete!==undefined&&!['Enabled','Disabled'].includes(stateFields.MfaDelete))throw fail();
 }
 const check=(key,v)=>{if(!keyValid(key)||v!==undefined&&!version(v))throw fail('AUDIT_STORAGE_INVALID_REFERENCE',400);};
 return Object.freeze({id:'s3',credentialsReady:true,capabilities:{private:true,durable:true,versioned:true,conditionalWrites:true},
  async probe({signal}){await verifyBucket(signal);return true;},
  async put({key,bytes,mimeType,sha256,ifAbsent,signal}){
   check(key);if(ifAbsent!==true)throw fail('AUDIT_STORAGE_INVALID_REFERENCE',400);await verifyBucket(signal);
   const r=await request('PUT',key,signal,{bytes,headers:{'content-type':mimeType,'x-amz-meta-sha256':sha256}});await smallBody(r.body,signal);
   const v=r.headers?.['x-amz-version-id'];if(!version(v)||r.headers?.['x-amz-server-side-encryption']!=='AES256')throw fail('AUDIT_STORAGE_INVALID_RECEIPT');
   return{version:v,private:true};
  },
  async get({key,version:v,signal}){
   check(key,v);if(!version(v))throw fail('AUDIT_STORAGE_INVALID_REFERENCE',400);await verifyBucket(signal);
   const r=await request('GET',key,signal,{query:{versionId:v}});
   if(r.headers?.['x-amz-version-id']!==v){r.body?.destroy?.();throw fail('AUDIT_STORAGE_IDENTITY_MISMATCH',409);}return r.body;
  },
  async remove({key,version:v,signal}){check(key,v);if(!version(v))throw fail('AUDIT_STORAGE_INVALID_REFERENCE',400);const r=await request('DELETE',key,signal,{query:{versionId:v}});await smallBody(r.body,signal);},
 });
}
module.exports={createAdapter,configFromEnvironment};
