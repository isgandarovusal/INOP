// Explicit, on-demand, metadata-only bridge to the independent Cloudflare Recruitment Worker.
// Never send candidate data or CV bytes. No background polling, inference or upload.
const ENDPOINT = 'https://inop-recruitment-api.isgandarovusal.workers.dev/v1/status';
const STATUS_FIELDS = ['service','schemaVersion','cvIntake','aiInference','scanner','humanReview'];
const unavailable = () => Object.assign(new Error('Independent Recruitment service unavailable.'),{status:503,code:'RECRUITMENT_CLOUD_UNAVAILABLE'});
async function status({environment=process.env,request=globalThis.fetch}={}) {
 if(environment.RECRUITMENT_CLOUD_ENABLED!=='true')throw unavailable();
 const token=environment.RECRUITMENT_CLOUD_TOKEN;
 if(typeof token!=='string'||token.length<32)throw unavailable();
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),4000);
 try {
  const result=await request(ENDPOINT,{method:'GET',headers:{authorization:'Bearer '+token,accept:'application/json'},signal:controller.signal,redirect:'manual',cache:'no-store'});
  if(!result||result.status!==200||result.headers?.get?.('content-type')?.split(';')[0]?.trim()!=='application/json')throw unavailable();
  const body=await result.text();
  if(body.length>2048)throw unavailable();
  const data=JSON.parse(body);
  if(data?.ok!==true||data.schemaVersion!==3||data.cvIntake!=='disabled'||data.aiInference!=='disabled')throw unavailable();
  return Object.fromEntries(STATUS_FIELDS.map(field=>[field,data[field]]));
 }catch {throw unavailable();}
 finally {clearTimeout(timer);}
}
module.exports={status};

const PUBLIC_HEALTH_ENDPOINT='https://inop-recruitment-api.isgandarovusal.workers.dev/health';
// Safe metadata-only fallback: no keys, CV information, AI operations or write permissions.
// Separate from protected status() and explicitly enabled on Render.
async function publicHealth({environment=process.env,request=globalThis.fetch}={}){
 if(environment.RECRUITMENT_CLOUD_PUBLIC_HEALTH_ENABLED!=='true')throw unavailable();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
 try{
  const result=await request(PUBLIC_HEALTH_ENDPOINT,{method:'GET',headers:{accept:'application/json'},signal:controller.signal,redirect:'manual',cache:'no-store'});
  if(result?.status!==200||result.headers?.get?.('content-type')?.split(';')[0]?.trim()!=='application/json')throw unavailable();
  const body=await result.text();
  if(body.length>512)throw unavailable();
  const data=JSON.parse(body);
  if(data?.service!=='inop-recruitment'||data?.status!=='bootstrap'||data?.cvIntake!=='disabled'||data?.aiInference!=='disabled')throw unavailable();
  return {service:'inop-recruitment',schemaVersion:3,cvIntake:'disabled',aiInference:'disabled',scanner:'not-verified',humanReview:'mandatory',connectionMode:'public-health-only'};
 }catch{throw unavailable();}
 finally{clearTimeout(timer);}
}
module.exports.publicHealth=publicHealth;
