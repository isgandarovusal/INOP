const {test}=require('node:test'),assert=require('node:assert/strict');
const standard=require('../services/standardAuditAssessment.service');
const answers=(brand,value)=>standard.contentFor(brand).sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:value,comment:'Synthetic observation'})));
test('All source standards, both worksheets, duplicate codes and missing risk are preserved',()=>{
 assert.deepEqual(standard.sources.map(s=>[s.brandId,s.sections.length,s.sections.flatMap(s=>s.questions).length,s.worksheets.length]),[['kfc',10,190,2],['pizza-hut',10,123,2],['simit-sarayi',10,71,2]]);
 const kfc=standard.sourceFor('kfc');assert.equal(kfc.sections.flatMap(s=>s.questions).find(q=>q.sourceCell==='B148'&&q.worksheet==='QT').sourceRisk,null);assert.ok(kfc.duplicates.some(d=>d.sourceCode==='6.24'&&d.ids.length===2));
 for(const s of standard.sources){const q=s.sections.flatMap(s=>s.questions);assert.equal(q.length,new Set(q.map(q=>q.id)).size);assert.ok(q.every(q=>q.sourceText&&q.sourceFile&&q.worksheet&&q.sourceRow&&q.id));assert.equal(standard.verifiedSource(standard.contentFor(s.brandId)),s);}
});
test('Approved Standard formula, N/A neutrality, unanswered and source risk are independent on all brands',()=>{
 for(const s of standard.sources){const c=standard.contentFor(s.brandId),a=answers(s.brandId,'na'),reasons=Object.fromEntries(a.map(a=>[a.questionId,'Synthetic objective restaurant absence']));
  const na=standard.assessStandard(c,a,true,{naReasons:reasons});assert.equal(na.overallPercentage,null);assert.equal(na.standardAssessment.applicable,0);assert.equal(na.standardAssessment.na,a.length);
  ['compliant','critical','major','minor'].forEach((v,i)=>a[i].answer=v);
  const mixed=standard.assessStandard(c,a,true,{naReasons:reasons});assert.equal(mixed.overallPercentage,25);assert.equal(mixed.standardAssessment.applicable,4);for(const k of ['compliant','critical','major','minor'])assert.equal(mixed.standardAssessment[k],1);assert.equal(mixed.passed,null);
  assert.equal(standard.assessStandard(c,answers(s.brandId,'compliant'),true).overallPercentage,100);assert.equal(standard.assessStandard(c,answers(s.brandId,'critical'),true).overallPercentage,0);
  assert.throws(()=>standard.assessStandard(c,answers(s.brandId,'na'),true),{status:422});assert.throws(()=>standard.assessStandard(c,a.slice(1),true,{naReasons:reasons}),{status:422});
  assert.throws(()=>standard.assessStandard(c,[{...a[0],comment:123}]),{status:400});
  assert.throws(()=>standard.assessStandard(c,answers(s.brandId,'compliant'),true,{criterionObservations:[{standardId:a[0].questionId,description:''}]}),{status:422});
  const draft=standard.assessStandard(c,[]);assert.equal(draft.standardAssessment.unanswered,a.length);assert.equal(draft.standardAssessment.na,0);assert.equal(draft.overallPercentage,null);
  assert.throws(()=>standard.assessStandard(c,[...a,a[0]]),{status:400});assert.throws(()=>standard.assessStandard(c,[{questionId:'other-brand',answer:'compliant'}]),{status:400});assert.throws(()=>standard.assessStandard(c,[{questionId:a[0].questionId,answer:'0.5'}]),{status:400});
  const altered=standard.contentFor(s.brandId);altered.sections[0].questions.pop();assert.throws(()=>standard.assessStandard(altered,[]),{status:409});
 }
});
test('Retained catalogue versions remain verifiable and new publication cannot reinterpret an older draft',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module'),filename=require.resolve('../services/standardAuditAssessment.service');
 const current=require('../config/standardAuditSources.json'),archived={...structuredClone(current[0]),version:'reviewed-historical-fixture'};
 const records=[archived,...structuredClone(current)],context={module:{exports:{}},require:id=>id==='../config/standardAuditSources.json'?records:createRequire(filename)(id)};vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});const service=context.module.exports;
 assert.equal(service.sourceFor('kfc').version,'standard-source-v1');const snapshot=service.contentFor('kfc',archived.version);assert.equal(service.verifiedSource(snapshot).version,archived.version);
 const a=snapshot.sections.flatMap(s=>s.questions.map(q=>({questionId:q.id,answer:'compliant'})));assert.equal(service.assessStandard(snapshot,a,true).overallPercentage,100);
 const bad=structuredClone(snapshot);bad.standardSource.version='unknown-version';assert.throws(()=>service.assessStandard(bad,a,true),{status:409});
});
