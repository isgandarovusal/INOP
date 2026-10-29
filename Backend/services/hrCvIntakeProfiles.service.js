// Server-only opt-in. No installation, external AI or automatic worker startup.
// Recovery/retention approval and a verified scanner runtime precede activation.
let activeProfile, activeScanner, scannerBinary;
// Shared native instance preserves the adapter's concurrency/deadline controls.
// Read-only legacy parsing needs scanning, not activation of durable intake/storage.
exports.scanner=()=>{
 if(process.env.HR_CV_SCAN_ENABLED!=='true')throw Error('Scanner disabled');
 const binary=process.env.HR_CV_SCAN_BINARY;
 if(!activeScanner||scannerBinary!==binary){
  activeScanner=require('./hrClamScan.service').createScanner({enabled:true,binary});
  scannerBinary=binary;
 }
 return activeScanner;
};
exports.profile=()=>{
 const {createIntake}=require('./hrCvIntake.service');
 if(process.env.HR_CV_DURABLE_INTAKE_ENABLED!=='true')return createIntake();
 if(activeProfile)return activeProfile;
 try{
  if(process.env.HR_CV_SCAN_ENABLED!=='true')throw Error('Scanner disabled');
  const store=require('./hrPrivateObjectStorage.service').fromEnvironment();
  const scanner=exports.scanner();
  const ocrEngine=require('./hrCvOcrEngine.service').createOcrEngine({enabled:process.env.HR_CV_OCR_ENABLED==='true',...(process.env.HR_CV_OCR_DATA_DIRECTORY?{dataDirectory:process.env.HR_CV_OCR_DATA_DIRECTORY}:{})});
  activeProfile=createIntake({enabled:true,store,scanner,ocrEngine,scanBeforePersistence:true});
  return activeProfile;
 }catch{
  // Configuration failure must not hide authorized metadata or expose secrets.
  // Every write/download/processing operation remains disabled on this profile.
  return createIntake();
 }
};
