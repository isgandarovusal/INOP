const test=require('node:test'),assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Recruitment-only presets preserve legacy roles and deny Audit/Administration with fresh server authority',async()=>withAuditFixture(async h=>{
 for(const [actor,role]of [['own','recruitment_manager'],['peer','recruitment_employee']]){
 await h.models.User.updateOne({_id:h.actors[actor]._id},{$set:{role,departmentId:'dep_hr'}});
 assert.equal((await h.request(actor,'GET','/hr/v2/candidates')).status,200);
 for(const url of ['/audits','/users','/roles','/departments','/activity-logs','/audits/dashboard-summary'])assert.ok([403,404].includes((await h.request(actor,'GET',url)).status),url);
 const r=await h.models.Role.findOne({key:role});assert.ok(r.permissions.every(p=>['candidate','application','recruitment'].includes(p.resource)));
 }
 const legacy=await h.models.Role.findOne({key:'hr_manager'});assert.ok(legacy.permissions.some(p=>p.resource==='user'),'legacy roles are not silently narrowed');
 await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',departmentId:'dep_audit'}});assert.equal((await h.request('own','GET','/hr/v2/candidates')).status,403);
 assert.equal((await h.request('admin','GET','/users')).status,200);
},{canonicalHR:true}));
