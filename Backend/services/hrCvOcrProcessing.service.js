const {createProcessing}=require('./hrCvProcessing.service');
const {createOcrEngine}=require('./hrCvOcrEngine.service');
const {parseStructuredCv}=require('./cvStructuredParser.service');
const version='ocr-rules-1';
const keys=['name','email','phone','phoneRaw','role','education','skills','experience','languages','certificates','employmentHistory','educationHistory','certificationHistory'];
function parseOcrCv(text){
 const parsed=parseStructuredCv(text);
 // Only the exact visual HACCP acronym / established Russian abbreviation.
 // Never normalize names/contact/general prose or infer absent qualifications.
 const token=text.match(/(?<![\p{L}\p{N}])(?:[HНhн][AАaа][CСcс]{2}[PРpр]|[Хх][Аа][Сс]{2}[Пп])(?![\p{L}\p{N}])/u)?.[0];
 if(token&&!parsed.skills.includes('HACCP')){
  parsed.skills.push('HACCP');const field=parsed.extraction.fields.skills||{source:'ocr-text',confidence:null,evidence:[]};
  field.evidence=[...(field.evidence||[]),token];parsed.extraction.fields.skills=field;parsed.extraction.warnings.push('ocr_acronym_review');
 }
 return parsed;
}
function parseOcrOutput(output){
  if(!output||typeof output.text!=='string'||Buffer.byteLength(output.text)>100000||!Number.isInteger(output.pages)||output.pages<1||output.pages>3||output.engine?.provider!=='tesseract'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(output.engine.version||'')||!Array.isArray(output.engine.languages)||!output.engine.languages.length||output.engine.languages.some(l=>!['eng','aze','rus'].includes(l)))throw Object.assign(new Error('OCR output is unavailable.'),{code:'PROCESSING_INVALID_RESULT'});
  if(!output.text.trim())throw Object.assign(new Error('OCR output is unavailable.'),{code:'OCR_NO_TEXT'});
  const parsed=parseOcrCv(output.text),facts=Object.fromEntries(keys.filter(k=>parsed[k]!==undefined&&parsed[k]!==null&&parsed[k]!==''&&(!Array.isArray(parsed[k])||parsed[k].length>0)).map(k=>[k,parsed[k]]));
  const review={...parsed.extraction,version,provider:'tesseract-rules',confidenceKind:'uncalibrated_ocr',processingStatus:'extracted',reviewStatus:'pending',warnings:['ocr_review_required',...parsed.extraction.warnings]};
  // Pattern confidence is not OCR accuracy. Every recognized field must be
  // checked by HR against the original; absent facts remain absent/unknown.
  for(const row of Object.values(review.fields||{})){row.source='ocr-text';row.confidence=null;}
  return {parsed:facts,review,parserVersion:version,requiresApproval:true,engine:{...output.engine},pages:output.pages};
}

function createOcrProcessing({enabled=false,engine=createOcrEngine(),...queue}={}){
 return createProcessing({...queue,enabled,kind:'ocr',taskVersion:version,task:async({candidate,bytes,signal})=>{
  if(candidate.cvOriginal?.mimeType!=='application/pdf')return{state:'blocked',code:'OCR_PDF_REQUIRED'};
  let output;try{output=await engine.extract(bytes,{signal});}catch(error){
   const code={OCR_DISABLED:'OCR_NOT_CONFIGURED',OCR_RUNTIME_REQUIRED:'OCR_RUNTIME_REQUIRED',OCR_LANGUAGE_REQUIRED:'OCR_LANGUAGE_REQUIRED',OCR_LIMIT:'OCR_INPUT_LIMIT',OCR_INVALID_DOCUMENT:'OCR_INVALID_DOCUMENT'}[error?.code];
   if(code)return{state:'blocked',code};throw error;
  }
  try{return{state:'succeeded',code:'OCR_REVIEW_REQUIRED',result:parseOcrOutput(output)};}catch(error){if(error.code==='OCR_NO_TEXT')return{state:'blocked',code:'OCR_NO_TEXT'};throw error;}
 }});
}
module.exports={createOcrProcessing,parseOcrCv,parseOcrOutput};
