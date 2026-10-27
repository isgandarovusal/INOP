// Temporary, default-off operator diagnostic. No database or intake dependencies.
const crypto = require('node:crypto');
const storage = require('./hrPrivateObjectStorage.service');
const gates = ['HR_CV_DURABLE_INTAKE_ENABLED','HR_CV_SCAN_ENABLED','HR_CV_INTAKE_WORKER_ENABLED','HR_CV_OCR_ENABLED','HR_CV_PROCESSING_ENABLED','HR_CV_AI_PROCESSING_ENABLED'];
function createDiagnostic({env=process.env, now=Date.now, adapter=storage}={}) {
  const started=now(); let attempts=0, syntheticUsed=false;
  const challenges=new Map();
  const result=(status,code,extra={})=>({status,body:{code,...extra}});
  function active() {
    const end=Date.parse(env.HR_R2_DIAGNOSTIC_EXPIRES_AT);
    return env.HR_R2_DIAGNOSTIC_ENABLED==='true' && Number.isFinite(end) && end>now() && end<=started+15*60*1000 && /^[a-f0-9]{64}$/.test(env.HR_R2_DIAGNOSTIC_TOKEN_SHA256||'') && gates.every(k=>env[k]!=='true');
  }
  async function execute(req) {
    if(!active())return result(404,'DIAGNOSTIC_DISABLED');
    if(!req.user)return result(401,'DIAGNOSTIC_AUTH_REQUIRED');
    // A role name alone is insufficient: current active role and global authority.
    if(req.user.role!=='admin'||req.authRole?.key!=='admin'||req.authRole?.isActive!==true||req.permission?.scope!=='all')return result(403,'DIAGNOSTIC_ADMIN_REQUIRED');
    const origin=env.HR_R2_DIAGNOSTIC_ORIGIN;
    if(!origin || !/^https:\/\/[^/]+$/.test(origin) || req.headers.origin!==origin || req.headers['content-type']!=='application/json' || !req.headers.authorization?.startsWith('Bearer '))return result(403,'DIAGNOSTIC_REQUEST_REJECTED');
    const token=req.headers['x-inop-diagnostic-token'];
    if(typeof token!=='string'||token.length<32||token.length>256||!crypto.timingSafeEqual(crypto.createHash('sha256').update(token).digest(),Buffer.from(env.HR_R2_DIAGNOSTIC_TOKEN_SHA256,'hex')))return result(403,'DIAGNOSTIC_ACTIVATION_REQUIRED');
    if(++attempts>6)return result(429,'DIAGNOSTIC_RATE_LIMIT');
    const body=req.body;
    if(!body||Object.getPrototypeOf(body)!==Object.prototype||Object.keys(body).some(k=>!['action','challenge'].includes(k)))return result(400,'DIAGNOSTIC_INPUT');
    const actor=String(req.user.id), action=body.action;
    if(action==='challenge') {
      const nonce=crypto.randomBytes(32).toString('hex');
      challenges.set(nonce,{actor,expires:now()+60000});
      return result(200,'CHALLENGE_OK',{challenge:nonce});
    }
    const ticket=challenges.get(body.challenge); challenges.delete(body.challenge);
    if(!ticket||ticket.actor!==actor||ticket.expires<=now())return result(409,'DIAGNOSTIC_REPLAY_REJECTED');
    if(!['config','synthetic'].includes(action))return result(400,'DIAGNOSTIC_INPUT');
    if(action==='synthetic'&&(env.HR_R2_DIAGNOSTIC_SYNTHETIC_APPROVED!=='true'||env.HR_R2_DIAGNOSTIC_RETENTION_APPROVED!=='true'))return result(403,'DIAGNOSTIC_WRITE_NOT_APPROVED');
    if(['PROVIDER','ENDPOINT','BUCKET','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY'].some(k=>!env['HR_CV_STORAGE_'+k]))return result(503,'CONFIG_MISSING');
    if(env.HR_CV_STORAGE_BUCKET!=='inop-private-cv'||env.HR_CV_STORAGE_REGION!=='auto'||!/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com\/?$/.test(env.HR_CV_STORAGE_ENDPOINT||''))return result(503,'CONFIG_INVALID');
    let store;
    try { store=adapter.fromEnvironment(env); }
    catch(e){return result(503,e.code==='STORAGE_NOT_CONFIGURED'?'CONFIG_MISSING':'CONFIG_INVALID');}
    if(action==='config')return result(200,'CONFIG_OK');
    if(syntheticUsed)return result(409,'DIAGNOSTIC_ALREADY_ATTEMPTED');
    syntheticUsed=true; // Never retry an uncertain write with a fresh object.
    const bytes=Buffer.from('%PDF-1.4\n% INOP synthetic storage diagnostic; no personal data\n%%EOF\n');
    const ref=adapter.prepare(bytes,'application/pdf');
    try {
      await store.put(ref,bytes);
      const read=await store.get(ref);
      if(!Buffer.isBuffer(read)||!read.equals(bytes))return result(503,'DIAGNOSTIC_READBACK_FAILED');
      try { await store.put(ref,bytes); }
      catch(e){if(e.code==='STORAGE_WRITE_CONFLICT')return result(200,'R2_VERIFIED',{put:'OK',readback:'SHA256_OK',conditionalWrite:'REJECTED'});throw e;}
      return result(503,'DIAGNOSTIC_CONDITIONAL_WRITE_FAILED');
    } catch(e) {
      const safe=new Set(['STORAGE_TIMEOUT','STORAGE_WRITE_UNCERTAIN','STORAGE_UNAVAILABLE','STORAGE_NETWORK_DENIED','STORAGE_IDENTITY_MISMATCH','STORAGE_WRITE_CONFLICT','STORAGE_NOT_FOUND','STORAGE_ABORTED','STORAGE_RESPONSE_LIMIT','STORAGE_BUSY']);
      return result(503,safe.has(e.code)?e.code:'DIAGNOSTIC_STORAGE_FAILED');
    }
  }
  return {execute};
}
module.exports={createDiagnostic};
