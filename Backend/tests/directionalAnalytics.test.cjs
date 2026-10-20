const {test}=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('standard analytics-only grant reads scoped metadata without gaining audit or HR access',async()=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[{resource:'audit.standard.analytics',action:'read',scope:'own'}]}});
 for(const endpoint of ['analytics-sources','analytics-options','analytics'])assert.equal((await h.request('own','GET','/audit-standard/'+endpoint)).status,200,endpoint);
 for(const endpoint of ['sources','options','list'])assert.equal((await h.request('own','GET','/audit-standard/'+endpoint)).status,403,endpoint);
 assert.equal((await h.request('own','POST','/audit-standard/audits',{})).status,403);
 assert.equal((await h.request('own','GET','/audit-hr/analytics')).status,403);
}));
