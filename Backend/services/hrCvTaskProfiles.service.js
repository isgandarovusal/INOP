const processing=require('./hrCvProcessing.service');
const ocr=require('./hrCvOcrProcessing.service');
const {createOcrEngine}=require('./hrCvOcrEngine.service');
const fail=()=>Object.assign(new Error('CV processing profile is invalid.'),{code:'PROCESSING_INVALID_INPUT',status:400});
function profile(kind='parse'){
 if(kind==='parse')return processing.createProcessing();
 if(kind==='ocr')return ocr.createOcrProcessing({enabled:process.env.HR_CV_OCR_ENABLED==='true',engine:createOcrEngine({enabled:process.env.HR_CV_OCR_ENABLED==='true',...(process.env.HR_CV_OCR_DATA_DIRECTORY?{dataDirectory:process.env.HR_CV_OCR_DATA_DIRECTORY}:{})})});
 if(kind==='ai-review')return require('./hrCvAiProcessing.service').createAiProcessing({enabled:process.env.HR_CV_AI_PROCESSING_ENABLED==='true'});
 throw fail();
}
module.exports={profile};
