// Server-only opt-in. No installation, external AI or automatic worker startup.
// Recovery/retention approval and a verified scanner runtime precede activation.
let activeProfile;
exports.profile=()=>{
 const {createIntake}=require('./hrCvIntake.service');
 if(process.env.HR_CV_DURABLE_INTAKE_ENABLED!=='true')return createIntake();
 if(activeProfile)return activeProfile;
 try{
  if(process.env.HR_CV_SCAN_ENABLED!=='true')throw Error('Scanner disabled');
  const store=require('./hrPrivateObjectStorage.service').fromEnvironment();
  const scanner=require('./hrClamScan.service').createScanner({enabled:true,binary:process.env.HR_CV_SCAN_BINARY});
  const ocrEngine=require('./hrCvOcrEngine.service').createOcrEngine({enabled:process.env.HR_CV_OCR_ENABLED==='true',...(process.env.HR_CV_OCR_DATA_DIRECTORY?{dataDirectory:process.env.HR_CV_OCR_DATA_DIRECTORY}:{})});
  activeProfile=createIntake({enabled:true,store,scanner,ocrEngine,scanBeforePersistence:true});
  return activeProfile;
 }catch{
  // Configuration failure must not hide authorized metadata or expose secrets.
  // Every write/download/processing operation remains disabled on this profile.
  return createIntake();
 }
};
