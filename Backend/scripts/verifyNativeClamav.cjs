// Explicit synthetic QA only. No routes, CV intake, R2, database or worker imports.
const crypto=require('node:crypto');
const {createScanner}=require('../services/hrClamScan.service');
const gates=['HR_CV_DURABLE_INTAKE_ENABLED','HR_CV_SCAN_ENABLED','HR_CV_INTAKE_WORKER_ENABLED','HR_CV_OCR_ENABLED','HR_CV_PROCESSING_ENABLED','HR_CV_AI_PROCESSING_ENABLED'];
async function syntheticFixtures() {
  const {pdf,docx}=require('../tests/helpers/cvDocuments.cjs');
  // Standard harmless antivirus test pattern; never real malware or CV data.
  const eicar=Buffer.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}', '$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(''),'ascii');
  return [
    {label:'clean_pdf',bytes:await pdf('INOP synthetic scanner fixture. No personal data.'),mimeType:'application/pdf',expected:'clean'},
    {label:'clean_docx',bytes:docx('INOP synthetic scanner fixture. No personal data.'),mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',expected:'clean'},
    // Raw EICAR tests the engine, not PDF format validation.
    {label:'eicar_raw',bytes:eicar,mimeType:'application/pdf',expected:'infected'},
    {label:'eicar_docx',bytes:docx(eicar.toString('ascii')),mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',expected:'infected'},
  ];
}
function createQa({env=process.env,scannerFactory=createScanner,fixtures=syntheticFixtures,emit=record=>console.log(JSON.stringify(record)),clock=()=>performance.now()}={}) {
 let attempted=false;
 return {async run({execute=false}={}) {
  if(!execute||env.INOP_NATIVE_AV_QA_ENABLED!=='true'){emit({code:'NATIVE_AV_QA_DISABLED'});return false;}
  if(attempted){emit({code:'NATIVE_AV_QA_ALREADY_ATTEMPTED'});return false;}attempted=true;
  if(env.RENDER==='true'||gates.some(k=>env[k]!==undefined&&env[k]!=='false')){emit({code:'NATIVE_AV_QA_SCOPE_REJECTED'});return false;}
  try {
   const scanner=scannerFactory({enabled:true,binary:'/usr/bin/clamscan'}),samples=await fixtures();
   if(samples.length!==4)throw Error('Invalid synthetic fixtures');
   for(const [i,sample]of samples.entries()) {
    if(sample.label!==['clean_pdf','clean_docx','eicar_raw','eicar_docx'][i]||!Buffer.isBuffer(sample.bytes)||!sample.bytes.length||sample.bytes.length>5*1024*1024)throw Error('Invalid synthetic fixtures');
    const sha256=crypto.createHash('sha256').update(sample.bytes).digest('hex'),start=clock();
    const result=await scanner.scan(sample.bytes,{mimeType:sample.mimeType,sha256});
    if(result.verdict!==sample.expected||result.sha256!==sha256||result.engine!=='clamav'||!/^[\d.]{1,20}-db\d{1,12}$/.test(result.version||''))throw Error('Native verdict mismatch');
    emit({code:'NATIVE_AV_FIXTURE_PASS',fixture:sample.label,durationMs:Math.round(clock()-start),engine:result.engine,version:result.version});
   }
   emit({code:'NATIVE_AV_FIXTURES_PASS',productionReady:false});return true;
  }catch(error) {
   const code=['AV_DISABLED','AV_CONFIGURATION','AV_UNAVAILABLE','AV_DEFINITIONS','AV_INPUT','AV_BUSY','AV_TIMEOUT','AV_CANCELLED'].includes(error?.code)?error.code:'NATIVE_AV_QA_FAILED';
   emit({code,productionReady:false});return false;
  }
 }};
}
if(require.main===module) {
 const args=process.argv.slice(2);
 createQa().run({execute:args.length===1&&args[0]==='--synthetic-only'}).then(ok=>{process.exitCode=ok?0:1;}).catch(()=>{console.log('{"code":"NATIVE_AV_QA_FAILED","productionReady":false}');process.exitCode=1;});
}
module.exports={createQa,syntheticFixtures};
