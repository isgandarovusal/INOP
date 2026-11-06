const test=require('node:test'),assert=require('node:assert/strict'),{parseOcrCv}=require('../services/hrCvOcrProcessing.service');
test('OCR acronym aliases never turn explicit AZ/EN/RU negation or conflicting context into a skill',()=>{
 assert.ok(!parseOcrCv('Skills\nHACCP').extraction.warnings.includes('ocr_acronym_review'));
 for(const text of ['No НАССР certification','НАССР sertifikatı yoxdur','Нет сертификата НАССР','Skills\nНАССР\nNot certified in НАССР']){
  const parsed=parseOcrCv(text);assert.equal(parsed.skills.includes('HACCP'),false,text);assert.ok(parsed.extraction.warnings.includes('ocr_acronym_review'));
 }
});
