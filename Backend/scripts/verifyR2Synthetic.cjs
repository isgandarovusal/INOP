// Explicit operator invocation only. Never imported by server/routes/workers.
const crypto=require('node:crypto');
const storage=require('../services/hrPrivateObjectStorage.service');
const APPROVAL='CREATE ONE 64 BYTE SYNTHETIC OBJECT AND RETAIN IT';
const PAYLOAD='%PDF-1.4\n% INOP synthetic storage test; no personal data.\n%%EOF\n';
const PAYLOAD_BYTES=64;
const gates=['HR_CV_DURABLE_INTAKE_ENABLED','HR_CV_SCAN_ENABLED','HR_CV_INTAKE_WORKER_ENABLED','HR_CV_OCR_ENABLED','HR_CV_PROCESSING_ENABLED','HR_CV_AI_PROCESSING_ENABLED'];
function createVerifier({env=process.env,adapter=storage,confirm=async()=>false,emit=code=>console.log(code)}={}) {
  let attempted=false;
  return {async run({execute=false}={}) {
    const fail=code=>{emit(code);return false;};
    if(execute!==true)return fail('VERIFICATION_DISABLED');
    if(attempted)return fail('VERIFICATION_ALREADY_ATTEMPTED');
    attempted=true;
    if(gates.some(k=>env[k]!==undefined&&env[k]!=='false'))return fail('CV_GATES_NOT_DISABLED');
    if(['PROVIDER','ENDPOINT','BUCKET','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY'].some(k=>!env['HR_CV_STORAGE_'+k]))return fail('CONFIG_MISSING');
    // Deliberately match the approved production standard R2 profile (df62a60).
    if(env.HR_CV_STORAGE_BUCKET!=='inop-private-cv'||env.HR_CV_STORAGE_REGION!=='auto'||!/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com\/?$/.test(env.HR_CV_STORAGE_ENDPOINT))return fail('CONFIG_INVALID');
    let store;
    try {store=adapter.fromEnvironment(env);}catch {return fail('CONFIG_INVALID');}
    emit('CONFIG_OK');
    let approved=false;
    try {approved=await confirm()===true;}catch {/* Never echo terminal/provider errors. */}
    if(!approved)return fail('OPERATOR_CONFIRMATION_REQUIRED');
    const bytes=Buffer.from(PAYLOAD,'utf8'),expected=crypto.createHash('sha256').update(bytes).digest();
    if(bytes.length!==PAYLOAD_BYTES)return fail('VERIFICATION_FAILED');
    // prepare() supplies a new cryptographic UUID; never accept a key/file argument.
    const ref=adapter.prepare(bytes,'application/pdf');
    try {await store.put(ref,bytes);}catch {return fail('WRITE_FAILED');}
    emit('WRITE_OK');
    let received;
    try {received=await store.get(ref);}catch(error) {
      emit('READBACK_FAILED');
      if(error?.code==='STORAGE_IDENTITY_MISMATCH')emit('SHA256_MISMATCH');
      return false;
    }
    if(!Buffer.isBuffer(received))return fail('READBACK_FAILED');
    emit('READBACK_OK');
    if(received.length!==PAYLOAD_BYTES||!crypto.timingSafeEqual(crypto.createHash('sha256').update(received).digest(),expected))return fail('SHA256_MISMATCH');
    emit('SHA256_MATCH');
    try {await store.put(ref,bytes);}catch(error) {
      if(error?.code==='STORAGE_WRITE_CONFLICT'){emit('WRITE_CONFLICT_CONFIRMED');return true;}
      return fail('WRITE_CONFLICT_FAILED');
    }
    return fail('WRITE_CONFLICT_FAILED');
  }};
}
async function confirmAtTerminal(input=process.stdin,output=process.stdout) {
  // Deploy/start commands, schedulers and piped input cannot approve execution.
  if(!input.isTTY||!output.isTTY)return false;
  const prompt=require('node:readline/promises').createInterface({input,output});
  try {return await prompt.question(APPROVAL+'\nType the exact phrase to approve this invocation: ')===APPROVAL;}
  finally {prompt.close();}
}
if(require.main===module) {
  const args=process.argv.slice(2);
  createVerifier({confirm:confirmAtTerminal}).run({execute:args.length===1&&args[0]==='--execute'})
    .then(ok=>{process.exitCode=ok?0:1;})
    .catch(()=>{console.log('VERIFICATION_FAILED');process.exitCode=1;});
}
module.exports={createVerifier,confirmAtTerminal,APPROVAL,PAYLOAD_BYTES};
