const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),express=require('express');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Snapshot=require('../models/auditDepartmentSnapshot.model');
test('four real department records isolate audit lists, details, updates and exports while canonical HR membership remains closed',async()=>withAuditFixture(async h=>{
 await Snapshot.createIndexes();const actors=['own','peer','foreign','assigned'],records={};
 await h.models.Role.updateOne({key:'test_department'},{$push:{permissions:{$each:['candidate','application','recruitment'].map(resource=>({resource,action:'*',scope:'department'}))}}});
 for(const actor of actors){const d=await h.request('admin','POST','/departments',{name:'Owned department '+actor});assert.equal(d.status,201);const departmentId=d.data.department.id;await h.models.User.updateOne({_id:h.actors[actor]._id},{$set:{role:'test_department',departmentId}});records[actor]=await h.audit(actor);await Snapshot.create({auditId:records[actor]._id,auditorId:String(h.actors[actor]._id),departmentId});}
 await Promise.all(actors.map(async actor=>{const listed=await h.request(actor,'GET','/audits');assert.equal(listed.status,200);assert.deepEqual(listed.data.map(a=>a.id),[records[actor].id]);assert.equal((await h.request(actor,'GET','/candidates')).status,403,'An audit department is not implicitly an HR member');
 for(const owner of actors){const id=records[owner].id;assert.equal((await h.request(actor,'GET',`/audits/${id}`)).status,actor===owner?200:404);if(actor!==owner){assert.equal((await h.request(actor,'PUT',`/audits/${id}`,{comments:'foreign write attempt'})).status,404);const denied=await h.request(actor,'GET',`/audit-export/${records[owner]._id}/excel`);assert.equal(denied.status,403);assert.ok(!denied.buffer.includes(Buffer.from('PK')));assert.ok(!JSON.stringify(denied.data).includes(records[owner].id));}}}));
 assert.equal((await h.request('admin','GET','/audits')).data.length,4);for(const a of actors)assert.notEqual((await h.models.Audit.findById(records[a]._id)).comments,'foreign write attempt');
},{canonicalHR:true}));
test('default IP budget is shared by four office users; do not silently widen the security limit',async()=>{
 const app=express();app.use(require('../middleware/networkSecurity.middleware').createApiRateLimiter());app.get('/',(_req,res)=>res.json({ok:true}));const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const base='http://127.0.0.1:'+server.address().port;for(let i=0;i<100;i++)assert.equal((await fetch(base,{headers:{'X-QA-User':String(i%4)}})).status,200);assert.equal((await fetch(base)).status,429);}finally{await new Promise(r=>server.close(r));}
});
