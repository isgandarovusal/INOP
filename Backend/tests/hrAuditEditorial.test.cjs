const {test}=require('node:test');const assert=require('node:assert/strict');
const source=require('../config/hrAuditSources.json'),editorial=require('../config/hrAuditEditorial.json');
const hr=require('../services/hrAuditAssessment.service');
test('HR editorial presentation maps every original criterion/section/instruction without changing source contracts',()=>{
 assert.deepEqual(editorial,require('../../Frontend/src/i18n/hrAuditEditorial.json'));
 const ids=[];let questions=0,instructions=0;
 for(const brand of source){
  for(const section of brand.sections){
   ids.push(section.id);assert.equal(editorial.entries[section.id].source,section.title);
   for(const q of section.questions){ids.push(q.id);questions++;const row=editorial.entries[q.id];
    assert.equal(row.source,q.label);assert.equal(row.sourceGuidance,q.guidance);assert.equal(row.sourceCell,q.sourceCell);assert.equal(row.sectionId,section.id);assert.equal(row.sheet,brand.worksheet);
    assert.equal(Boolean(row.guidance),Boolean(q.guidance));if(q.guidance)instructions++;
    for(const lang of ['az','en','ru']){assert.ok(row[lang].trim());if(q.guidance)assert.ok(row.guidance[lang].trim());}
    assert.equal(row.optionalRole===true,section.id==='kfc-s77');
   }
   for(const lang of ['az','en','ru'])assert.ok(editorial.entries[section.id][lang].trim());
  }
  const snapshot=hr.contentFor(brand.brandId);assert.deepEqual(snapshot.sections,brand.sections);assert.equal(hr.verifiedSource(snapshot).sha256,brand.sha256);
 }
 assert.equal(questions,172);assert.equal(instructions,75);assert.deepEqual(Object.keys(editorial.entries).sort(),ids.sort());assert.equal(ids.length,192);
 assert.match(editorial.entries['kfc-r80'].guidance.az,/Skautdan vəzifə öhdəliklərini/);assert.match(editorial.entries['kfc-r81'].guidance.az,/baş aşpazdan vəzifə öhdəliklərini/);
 assert.match(editorial.entries['kfc-r79'].az,/Klikun/);assert.match(editorial.entries['kfc-r80'].az,/Skaut/);
 assert.equal(source.find(b=>b.brandId==='pizza-hut').sections.flatMap(s=>s.questions).length,71);
});
