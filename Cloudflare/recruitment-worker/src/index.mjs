// INOP Recruitment Cloud. Never accept unscanned CVs into processing or AI.
const HEADERS={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...HEADERS,'content-type':'application/json; charset=utf-8'}});
const reject=(code,status)=>respond({ok:false,code},status);
const MIME=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const MAX_CV_BYTES=1048576; // Free Worker CPU/memory guard: no PDF/DOCX parsing here.
function validPdf(bytes){return bytes.length>=5 && bytes[0]===37 && bytes[1]===80 && bytes[2]===68 && bytes[3]===70 && bytes[4]===45;}
function validDocx(bytes){return bytes.length>=4 && bytes[0]===80 && bytes[1]===75 && bytes[2]===3 && bytes[3]===4;}
async function hasServiceAccess(request,secret){
 if(typeof secret!=='string'||secret.length<32)return null;
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer ')||header.length>512)return false;
 const input=new TextEncoder();
 const a=await crypto.subtle.digest('SHA-256',input.encode(header.slice(7)));
 const b=await crypto.subtle.digest('SHA-256',input.encode(secret));
 const aa=new Uint8Array(a),bb=new Uint8Array(b);let different=0;
 for(let i=0;i<aa.length;i++)different|=aa[i]^bb[i];
 return different===0;
}
const utcDay=()=>new Date().toISOString().slice(0,10);
async function intake(request,env){
 // The independent scanner and lawful consent verification are not yet accepted.
 // Even if this gate is explicitly opened, files stay quarantined and AI is blocked.
 if(env.RECRUITMENT_QUARANTINE_INTAKE_ENABLED!=='true')return reject('INTAKE_NOT_ENABLED',423);
 if(!env.PRIVATE_CV_BUCKET)return reject('STORAGE_UNAVAILABLE',503);
 const tenant=request.headers.get('x-inop-tenant');
 const candidateRef=request.headers.get('x-inop-candidate-ref');
 const consentRef=request.headers.get('x-inop-consent-ref');
 const len=Number(request.headers.get('content-length'));
 const mime=(request.headers.get('content-type')||'').trim();
 if(tenant!=='gfc'||!candidateRef||!(/^[a-f0-9]{24}$/i).test(candidateRef)
   ||!consentRef||!(/^[a-f0-9-]{36}$/i).test(consentRef)
   ||!MIME.has(mime)||!Number.isSafeInteger(len)||len<5||len>MAX_CV_BYTES)
     return reject('INVALID_INTAKE',400);
 let bytes;
 try{bytes=new Uint8Array(await request.arrayBuffer());}
 catch{return reject('INVALID_INTAKE',400);}
 if(bytes.length!==len || bytes.length>MAX_CV_BYTES ||
    !(mime==='application/pdf'?validPdf(bytes):validDocx(bytes)))
    return reject('INVALID_DOCUMENT',400);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 const id=crypto.randomUUID(),key='hr/cv/quarantine/'+id;
 // Conservative atomic reservation: at most 20 attempts per UTC day and tenant.
 // A lost upload/error still consumes the quota (no implicit retries).
 try{
  const reservation=await env.RECRUITMENT_DB.prepare(
   'INSERT INTO intake_daily_quota(tenant_id,utc_date,attempts) VALUES(?,?,1) ON CONFLICT(tenant_id,utc_date) DO UPDATE SET attempts=attempts+1 WHERE attempts < 20 RETURNING attempts'
  ).bind(tenant,utcDay()).first();
  if(!reservation?.attempts)return reject('INTAKE_QUOTA_REACHED',429);
 }catch{return reject('DATABASE_UNAVAILABLE',503);}
 try{
  await env.RECRUITMENT_DB.prepare(
   'INSERT INTO cv_sources(id,tenant_id,candidate_ref,object_key,sha256,mime_type,byte_size,scan_status,source_status,storage_status) VALUES(?,?,?,?,?,?,?,\'pending\',\'quarantined\',\'pending\')'
  ).bind(id,tenant,candidateRef,key,hash,mime,bytes.length).run();
 }catch{return reject('INTAKE_REJECTED',409);}
 try{
  await env.PRIVATE_CV_BUCKET.put(key,bytes,{httpMetadata:{contentType:mime,cacheControl:'private, no-store'},customMetadata:{sha256:hash}});
  await env.RECRUITMENT_DB.prepare(
   "UPDATE cv_sources SET storage_status='stored',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND scan_status='pending' AND source_status='quarantined'"
  ).bind(id).run();
 }catch{
  // Preserve the pending receipt for explicit reconciliation; never mark it clean.
  return reject('QUARANTINE_UNCONFIRMED',503);
 }
 return respond({ok:true,id,sourceStatus:'quarantined',scanStatus:'pending',processingAllowed:false},202);
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health'&&request.method==='GET')
   return respond({service:'inop-recruitment',status:'bootstrap',cvIntake:'disabled',aiInference:'disabled'});
 if(!path.startsWith('/v1/'))return reject('NOT_FOUND',404);
 const allowed=await hasServiceAccess(request,env.RECRUITMENT_SERVICE_TOKEN);
 if(allowed===null)return reject('SERVICE_NOT_CONFIGURED',503);
 if(!allowed)return reject('UNAUTHORIZED',401);
 if(!env.RECRUITMENT_DB)return reject('DATABASE_UNAVAILABLE',503);
 if(path==='/v1/status'&&request.method==='GET'){
  try{
   const row=await env.RECRUITMENT_DB.prepare('SELECT MAX(version) AS version FROM schema_migrations').first();
   if(row?.version!==2)return reject('SCHEMA_NOT_READY',503);
   return respond({ok:true,service:'inop-recruitment',schemaVersion:2,
    cvIntake:env.RECRUITMENT_QUARANTINE_INTAKE_ENABLED==='true'?'quarantine-only':'disabled',
    aiInference:'disabled',scanner:'not-verified',humanReview:'mandatory',maxDailyUploadAttempts:20});
  }catch{return reject('DATABASE_UNAVAILABLE',503);}
 }
 if(path==='/v1/sources'&&request.method==='GET'){
  if(url.searchParams.get('tenant')!=='gfc')return reject('INVALID_TENANT',400);
  try{
   const result=await env.RECRUITMENT_DB.prepare(
    'SELECT id,source_status,scan_status,storage_status,created_at FROM cv_sources WHERE tenant_id=? ORDER BY created_at DESC LIMIT 30'
   ).bind('gfc').all();
   return respond({ok:true,items:result.results||[],limit:30});
  }catch{return reject('DATABASE_UNAVAILABLE',503);}
 }
 if(path==='/v1/intakes'&&request.method==='POST')return intake(request,env);
 // Scanner approval, extraction and AI provider gates do not exist yet.
 if(request.method!=='GET'&&request.method!=='HEAD')return reject('INTAKE_NOT_ENABLED',423);
 return reject('NOT_FOUND',404);
}};
