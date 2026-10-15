const {test}=require('node:test');const assert=require('node:assert/strict');
const hr=require('../services/hrAuditAssessment.service');
const assess=require('../services/auditAssessment.service').assess;
const answers=(brand,value='1')=>hr.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:value})));
test('Original HR sources preserve all criteria and Pizza Hut secondary interview worksheet',()=>{
 assert.deepEqual(hr.sources.map(s=>[s.brandId,s.sections.length,s.sections.reduce((n,s)=>n+s.questions.length,0)]),[['kfc',8,66],['pizza-hut',8,71],['simit-sarayi',4,35]]);
 const ph=hr.sourceFor('pizza-hut');assert.deepEqual(ph.worksheets,['HRTR Yeni','Лист1']);assert.equal(ph.interviewGuide[0].cells.length,48);
 assert.equal(hr.sourceFor('kfc').formulas.find(f=>f.cell==='E93').formula,'(SUM(E85:E92)/47)'.replace(/^/,'='));
});
test('HR-only approved scoring excludes N/A from both numerator and denominator',()=>{
 for(const brand of ['kfc','pizza-hut','simit-sarayi']){
  const a=answers(brand,'na');a[0].answer='1';a[1].answer='0.5';a[2].answer='0';
  const result=assess(hr.contentFor(brand),a,true);assert.equal(result.overallPercentage,50);assert.equal(result.hrAssessment.applicable,3);assert.equal(result.hrAssessment.earned,1.5);assert.equal(result.hrAssessment.na,a.length-3);
  assert.equal(assess(hr.contentFor(brand),answers(brand,'0'),true).overallPercentage,0);
  assert.equal(assess(hr.contentFor(brand),answers(brand),true).overallPercentage,100);
  assert.equal(assess(hr.contentFor(brand),answers(brand,'na'),true).overallPercentage,null);
 }
 const service={auditType:'service',sections:[{questions:[{id:'q',answerType:'yes-no-na'}]}]};assert.equal(assess(service,[{questionId:'q',answer:'yes'}],true).overallPercentage,100);
 assert.equal(assess({auditType:'hr',sections:service.sections},[{questionId:'q',answer:'yes'}],true).overallPercentage,null);
});
test('Historical KFC v1 scoring stays blocked; new approved v2 does not use source divisor',()=>{
 const r=assess(hr.contentFor('kfc','source-v1'),answers('kfc'),true);assert.equal(r.overallPercentage,null);assert.equal(r.hrAssessment.earned,null);assert.ok(r.hrAssessment.sections.every(s=>s.percentage===null&&s.earned===null));assert.equal(r.assessmentStatus,'unscored');
});
test('Validation rejects duplicate, unknown, invalid numeric answers and altered source snapshots',()=>{
 const c=hr.contentFor('pizza-hut'),a=answers('pizza-hut');
 for(const candidate of [[...a,a[0]],[{questionId:'foreign',answer:'1'}],[{...a[0],answer:'2'}],[{...a[0],answer:0.5}]])assert.throws(()=>assess(c,candidate),{status:400});
 assert.throws(()=>assess(c,[],true),{status:422});assert.equal(assess(c,[],false).overallPercentage,null);
 for(const mutate of [c=>c.sections[0].questions.pop(),c=>c.sections[0].questions[0].label='changed',c=>c.hrSource.scoringStatus='fake',c=>c.sections[0].questions[0].required=false,c=>c.sections[0].active=false,c=>c.sections[0].questions[0].order=999,c=>c.sections[0].subsections=[{questions:[{id:'invented'}]}]]){const c=hr.contentFor('pizza-hut');mutate(c);assert.throws(()=>assess(c,a),{status:409});}
 assert.throws(()=>hr.normalizeDetails(c,{sectionNotes:{foreign:'note'}}),{status:400});assert.throws(()=>hr.normalizeDetails(c,{observations:'x'.repeat(10001)}),{status:400});
});

test('KFC v2 applicable denominator replaces fixed 47 only for new snapshots',()=>{const c=hr.contentFor('kfc');assert.equal(c.hrSource.version,'source-v2');const a=answers('kfc');for(const row of a.slice(-4))row.answer='na';const r=assess(c,a,true);assert.equal(r.overallPercentage,100);assert.equal(r.hrAssessment.applicable,62);assert.equal(r.hrAssessment.earned,62);assert.equal(r.hrAssessment.na,4);assert.notEqual(hr.bindingKey(hr.sourceFor('kfc')),`kfc:${hr.sourceFor('kfc').sha256}`);assert.throws(()=>assess({...c,hrSource:{...c.hrSource,version:'unknown'}},a,true),{status:409});});
