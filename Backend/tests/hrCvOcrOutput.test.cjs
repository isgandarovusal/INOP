const test=require('node:test'),assert=require('node:assert/strict');
const {parseOcrOutput}=require('../services/hrCvOcrProcessing.service');
const output=()=>({text:'Skills\nHACCP',pages:1,engine:{provider:'tesseract',version:'5.5.0',languages:['aze','eng','rus']}});
test('OCR receipt uses only bounded known engine provenance, never arbitrary engine payload',()=>{
 for(const mutate of [v=>v.engine.rawText='PRIVATE_RAW_CV',v=>v.engine.storageKey='PRIVATE_STORAGE_KEY',v=>v.engine.languages=['eng','eng'],v=>v.engine.languages=Array(4).fill('eng')]){const v=output();mutate(v);assert.throws(()=>parseOcrOutput(v),{code:'PROCESSING_INVALID_RESULT'});}
});
test('Valid AZ EN RU OCR receipt remains a cloned human-review proposal',()=>{
 const v=output(),result=parseOcrOutput(v);assert.equal(result.requiresApproval,true);assert.deepEqual(result.engine,v.engine);v.engine.languages.push('invalid');assert.deepEqual(result.engine.languages,['aze','eng','rus']);assert.equal('text' in result,false);assert.ok(result.parsed.skills.includes('HACCP'));
});
