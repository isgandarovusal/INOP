// Operator opt-in, read-only, once per process. No HTTP endpoint or intake imports.
const storage=require('./hrPrivateObjectStorage.service');
const gates=['HR_CV_DURABLE_INTAKE_ENABLED','HR_CV_SCAN_ENABLED','HR_CV_INTAKE_WORKER_ENABLED','HR_CV_OCR_ENABLED','HR_CV_PROCESSING_ENABLED','HR_CV_AI_PROCESSING_ENABLED'];
function createVerification({env=process.env,adapter=storage,emit=code=>console.info(code)}={}) {
  let pending;
  function report(code) { try { emit(code); } catch { /* Logging failure must not affect backend availability. */ } }
  async function verify() {
    if (gates.some(key=>env[key]==='true')) { report('CONFIG_INVALID');return; }
    if (['PROVIDER','ENDPOINT','BUCKET','REGION','ACCESS_KEY_ID','SECRET_ACCESS_KEY'].some(key=>!env['HR_CV_STORAGE_'+key])) { report('CONFIG_MISSING');return; }
    if (env.HR_CV_STORAGE_BUCKET!=='inop-private-cv' || env.HR_CV_STORAGE_REGION!=='auto' || !/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com\/?$/.test(env.HR_CV_STORAGE_ENDPOINT)) { report('CONFIG_INVALID');return; }
    let store;
    try { store=adapter.fromEnvironment(env); }
    catch(error) { report(error?.code==='STORAGE_NOT_CONFIGURED'?'CONFIG_MISSING':'CONFIG_INVALID');return; }
    report('CONFIG_OK');
    try { report(await store.checkConnection()===true?'R2_CONNECTION_OK':'R2_CONNECTION_FAILED'); }
    catch { report('R2_CONNECTION_FAILED'); }
  }
  function run() {
    if (env.HR_R2_VERIFY_ON_START!=='read-only')return Promise.resolve();
    // Store promise before execution: concurrent/repeated calls cannot repeat HEAD.
    if (!pending) pending=Promise.resolve().then(verify);
    return pending;
  }
  return Object.freeze({run});
}
module.exports={createVerification};
