const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../services/auditReleasePlan.service');
const id='0123456789abcdef01234567',template='1123456789abcdef01234567',revision='2123456789abcdef01234567';
function snapshot(){return{topology:{setName:'offline-fixture'},users:[],profiles:[],restaurants:[{id:'r',name:'KFC fixture',organizationId:'gfc',brandId:'kfc'}],templates:[{_id:template,organizationId:'gfc',brandId:'kfc',auditType:'service',publishedRevisionId:revision}],revisions:[{_id:revision,templateId:template,revision:1,content:{organizationId:'gfc',brandId:'kfc',auditType:'service'}}],contexts:[{_id:id,organizationId:'gfc',brandId:'kfc',restaurantId:'r',direction:'service',templateRevisionId:revision}],audits:[{_id:id,id:'fixture-audit',restaurantId:'r',auditType:'service',templateId:template,templateRevisionId:revision}],assignments:[],executions:[],evidence:[]};}
test('Offline rehearsal reports canonical mappings without writes or inferred revisions',()=>{
 const data=snapshot(),before=JSON.stringify(data),report=analyze(data);
 assert.equal(report.readyForReviewedMigration,true);assert.equal(report.productionVerified,false);assert.equal(report.writes,0);assert.equal(JSON.stringify(data),before);
 data.audits[0].auditType='Routine';delete data.audits[0].templateRevisionId;data.contexts=[];
 data.restaurants.push({id:'unknown',name:'Unnamed fixture'});
 const legacy=analyze(data);assert.equal(legacy.mappings.directions[0].canonical,null);assert.equal(legacy.mappings.revisions[0].revisionId,null);assert.equal(legacy.mappings.restaurants.unknown.length,1);assert.equal(legacy.readyForReviewedMigration,false);
});
test('Existing references alone cannot certify mismatched context/revision or incomplete profile',()=>{
 for(const mutate of[
  data=>data.contexts[0].brandId='pizza-hut',
  data=>data.contexts[0].organizationId='foreign',
  data=>data.contexts[0].direction='hr',
  data=>data.revisions[0].content.brandId='simit-sarayi',
  data=>data.audits[0].templateId='3123456789abcdef01234567',
  data=>data.templates[0].publishedRevisionId='3123456789abcdef01234567',
  data=>data.restaurants.push({...data.restaurants[0]}),
  data=>{data.users=[{_id:id,role:'auditor'}];data.profiles=[{_id:id,organizationId:'gfc',direction:'service',active:true}];},
 ]){const data=snapshot();mutate(data);const before=JSON.stringify(data);const report=analyze(data);assert.equal(report.readyForReviewedMigration,false);assert.ok(report.issues.length);assert.equal(JSON.stringify(data),before);}
 assert.throws(()=>analyze(null),TypeError);
});
