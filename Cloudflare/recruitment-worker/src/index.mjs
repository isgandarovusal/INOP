// INOP Recruitment: standalone Cloudflare control plane, fail-closed by default.
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'content-type':'application/json; charset=utf-8'}});
const error=(code,status)=>json({ok:false,code},status);
async function authorized(request,secret){
 if(typeof secret!=='string'||secret.length<32)return null;
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer ')||header.length>512)return false;
 const input=new TextEncoder();
 const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',input.encode(header.slice(7))),crypto.subtle.digest('SHA-256',input.encode(secret))]);
 const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/health'&&request.method==='GET')return json({service:'inop-recruitment',status:'bootstrap',cvIntake:'disabled',aiInference:'disabled'});
 if(!path.startsWith('/v1/'))return error('NOT_FOUND',404);
 const auth=await authorized(request,env.RECRUITMENT_SERVICE_TOKEN);
 if(auth===null)return error('SERVICE_NOT_CONFIGURED',503);
 if(!auth)return error('UNAUTHORIZED',401);
 if(!env.RECRUITMENT_DB)return error('DATABASE_UNAVAILABLE',503);
 if(path==='/v1/status'&&request.method==='GET'){
   try{
     const row=await env.RECRUITMENT_DB.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').first();
     if(row?.version!==1)return error('SCHEMA_NOT_READY',503);
     return json({ok:true,service:'inop-recruitment',schemaVersion:1,cvIntake:'disabled',aiInference:'disabled',scanner:'not-verified',humanReview:'mandatory'});
   }catch{return error('DATABASE_UNAVAILABLE',503);}
 }
 if(path==='/v1/sources'&&request.method==='GET'){
   const tenant=new URL(request.url).searchParams.get('tenant');
   if(!tenant||!/^[a-zA-Z0-9_-]{1,64}$/.test(tenant))return error('INVALID_TENANT',400);
   try{
     const result=await env.RECRUITMENT_DB.prepare('SELECT id,source_status,scan_status,created_at FROM cv_sources WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 30').bind(tenant).all();
     return json({ok:true,items:result.results||[],limit:30});
   }catch{return error('DATABASE_UNAVAILABLE',503);}
 }
 if(request.method!=='GET'&&request.method!=='HEAD')return error('INTAKE_NOT_ENABLED',423);
 return error('NOT_FOUND',404);
}};