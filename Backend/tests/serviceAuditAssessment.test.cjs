const{test}=require('node:test');const assert=require('node:assert/strict');const service=require('../services/serviceAuditAssessment.service');
const{assess}=require('../services/auditAssessment.service');
const answers=(brand,value='1')=>service.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:value})));
test('Service sources preserve brand sections, criteria, original texts and KFC average reference',()=>{
 assert.deepEqual(service.sources.map(b=>[b.brandId,b.sections.length,b.sections.flatMap(s=>s.questions).length,b.referenceRows.length]),[['kfc',13,94,1],['pizza-hut',11,79,0],['simit-sarayi',10,61,0]]);
 for(const b of service.sources){const c=service.contentFor(b.brandId);assert.equal(c.auditType,'service');assert.equal(new Set(answers(b.brandId).map(a=>a.questionId)).size,answers(b.brandId).length);assert.ok(c.sections.flatMap(s=>s.questions).every(q=>q.sourceText&&q.sourceCell&&q.label));assert.equal(b.formulas.length,0);assert.equal(c.serviceSource.scoringStatus,'approved-service-contract-v1');}
 assert.equal(service.sourceFor('kfc').referenceRows[0].sourceCell,'B79');assert.equal(service.sourceFor('simit-sarayi').answerColumns.D,undefined);
});
test('All three Service brands score Yes/Partial/No/N/A including SS Partial and all-N/A null',()=>{
 for(const b of service.sources){const snapshot=service.contentFor(b.brandId),a=answers(b.brandId,'na');a[0].answer='1';a[1].answer='0.5';a[2].answer='0';const r=assess(snapshot,a,true);assert.equal(r.overallPercentage,50);assert.equal(r.serviceAssessment.applicable,3);assert.equal(r.serviceAssessment.earned,1.5);assert.equal(r.serviceAssessment.na,a.length-3);
 assert.equal(assess(snapshot,answers(b.brandId,'na'),true).overallPercentage,null);assert.equal(assess(snapshot,answers(b.brandId,'0'),true).overallPercentage,0);assert.equal(assess(snapshot,answers(b.brandId),true).overallPercentage,100);assert.equal(assess(snapshot,answers(b.brandId,'0.5'),true).overallPercentage,50);}
});
test('Source tampering and invalid answers are rejected without changing legacy Service or HR scoring',()=>{
 const snapshot=service.contentFor('kfc'),a=answers('kfc');for(const rows of [[...a,a[0]],[{questionId:'foreign',answer:'1'}],[{...a[0],answer:'yes'}],[{...a[0],answer:'2'}]])assert.throws(()=>assess(snapshot,rows,true),{status:400});
 assert.throws(()=>assess(snapshot,[],true),{status:422});assert.equal(assess(snapshot,[]).overallPercentage,null);
 const altered=service.contentFor('kfc');altered.sections[0].questions[0].label='forged';assert.throws(()=>assess(altered,a,true),{status:409});
 const legacy={auditType:'service',sections:[{questions:[{id:'q',answerType:'yes-no-na'}]}]};assert.equal(assess(legacy,[{questionId:'q',answer:'yes'}],true).overallPercentage,100);
 assert.equal(assess(require('../services/hrAuditAssessment.service').contentFor('kfc'),require('../services/hrAuditAssessment.service').contentFor('kfc').sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'0.5'}))),true).overallPercentage,50);
 assert.throws(()=>service.normalizeDetails(snapshot,{sectionPhotos:{foreign:'id'}}),{status:400});
});
test('KFC B67 positive conformity is versioned; old negative answers cannot earn conformity or be silently reinterpreted',()=>{
 const original=require('../config/serviceAuditSources.json').find(s=>s.brandId==='kfc');
 const old=service.contentFor('kfc','service-source-v1'),current=service.contentFor('kfc');
 assert.equal(old.version,'service-source-v1');assert.equal(current.version,'service-source-v2');
 assert.notEqual(service.bindingKey(original),service.bindingKey(service.sourceFor('kfc')));
 assert.deepEqual(old.sections,original.sections);assert.equal(service.verifiedSource(old).version,'service-source-v1');
 const before=old.sections.flatMap(s=>s.questions),after=current.sections.flatMap(s=>s.questions);
 assert.deepEqual(after.map(q=>[q.id,q.sourceCell,q.sourceNumber,q.sourceText]),before.map(q=>[q.id,q.sourceCell,q.sourceNumber,q.sourceText]));
 for(let i=0;i<before.length;i++)if(before[i].id!==service.NEGATIVE_CRITERION)assert.deepEqual(after[i],before[i]);
 const q=after.find(q=>q.id===service.NEGATIVE_CRITERION);assert.match(q.label,/düzgün təşkil edilib/);assert.match(q.sourceText,/edilməyib/);
 for(const value of ['0','0.5','1']){
  const rows=answers('kfc','na');rows.find(a=>a.questionId===q.id).answer=value;
  assert.equal(assess(current,rows,true).overallPercentage,Number(value)*100);
  const draft=assess(old,rows);assert.equal(draft.overallPercentage,null);assert.equal(draft.serviceAssessment.earned,null);assert.deepEqual(draft.serviceAssessment.reviewRequired,[q.id]);assert.equal(draft.serviceAssessment.sections.find(s=>s.id==='service-kfc-s58').earned,null);
  assert.throws(()=>assess(old,rows,true),{status:422});
 }
 assert.equal(assess(old,answers('kfc','na'),true).overallPercentage,null);
 const unknown=structuredClone(current);unknown.serviceSource.version='forged';assert.throws(()=>assess(unknown,answers('kfc'),true),{status:409});
 // Undefined target metrics are still a knowledge check, never invented numeric thresholds.
 for(const id of ['service-kfc-r106','service-kfc-r115']){
  assert.deepEqual(after.find(q=>q.id===id),before.find(q=>q.id===id));
  const rows=answers('kfc','na');rows.find(a=>a.questionId===id).answer='0.5';assert.equal(assess(current,rows,true).overallPercentage,50);
 }
});
