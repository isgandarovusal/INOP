const test=require('node:test'),assert=require('node:assert/strict');
const review=require('../services/hrAiCvReview.service');
const context=(quotes,field='certificates')=>review.context({version:'cv-professional-evidence-v1',facts:quotes.map((quote,i)=>({id:`e${i+1}`,field,quote}))});
const proposal=(value='HACCP',field='certificates',ids=['e1'])=>({status:'suggested',proposals:[{field,value,evidenceIds:ids,reason:'Literal evidence for human review',confidence:null}],uncertainty:[]});
for(const [locale,quote]of [['en','Does not hold a HACCP certificate'],['az','HACCP sertifikatı yoxdur'],['az-uppercase','HACCP sertifikatı DEYİL'],['ru','Сертификата HACCP нет']]){
 test(`${locale}: explicit absence cannot become a positive certificate proposal`,()=>assert.throws(()=>review.validate(proposal(),context([quote])),{code:'AI_INVALID_OUTPUT'}));
 test(`${locale}: citing only positive evidence cannot hide same-field contradictory evidence`,()=>assert.throws(()=>review.validate(proposal(),context(['HACCP certificate',quote])),{code:'AI_INVALID_OUTPUT'}));
}
for(const quote of ['No SQL experience','Without SQL knowledge','SQL knowledge is unknown','SQL biliyi yoxdur','SQL məlum deyil','Нет опыта SQL','SQL не подтверждено'])test(`Obvious uncertain/negated skill requires manual review: ${quote}`,()=>assert.throws(()=>review.validate(proposal('SQL','skills'),context([quote],'skills')),{code:'AI_INVALID_OUTPUT'}));
test('Clear affirmative literal evidence remains advisory and HR-approved only',()=>{assert.equal(review.validate(proposal(),context(['HACCP certificate'])).proposals[0].value,'HACCP');});
test('Token boundaries preserve NoSQL and notebook labels',()=>{for(const value of ['NoSQL','notebook'])assert.equal(review.validate(proposal(value,'skills'),context([value],'skills')).proposals[0].value,value);});
test('Negative evidence for another exact value or field does not suppress valid evidence',()=>{
 assert.equal(review.validate(proposal(),context(['HACCP certificate','No forklift certificate'])).proposals[0].value,'HACCP');
 const input=context(['HACCP certificate']);input.facts.push({id:'e2',field:'skills',quote:'No HACCP skill experience'});assert.equal(review.validate(proposal(),input).proposals[0].value,'HACCP');
});
test('Known zero experience remains a factual zero, not fabricated positive experience',()=>{assert.equal(review.validate(proposal('0','experience'),context(['No experience: 0 years'],'experience')).proposals[0].value,'0');assert.throws(()=>review.validate(proposal('5','experience'),context(['Not 5 years of experience'],'experience')),{code:'AI_INVALID_OUTPUT'});});
test('Abstention stays available and input packets are not rewritten',()=>{const input=context(['No HACCP certificate']),copy=structuredClone(input);assert.deepEqual(review.validate({status:'insufficient_context',proposals:[],uncertainty:[]},input).proposals,[]);assert.deepEqual(input,copy);});
test('Guard is conservative for ambiguous negation, never a positive entailment certificate',()=>assert.throws(()=>review.validate(proposal(),context(['HACCP certificate; no incidents reported'])),{code:'AI_INVALID_OUTPUT'}));

for(const quote of ["Doesn't hold a HACCP certificate","Hasn’t obtained HACCP"])test('English contraction stays negative: '+quote,()=>assert.throws(()=>review.validate(proposal(),context([quote])),{code:'AI_INVALID_OUTPUT'}));
