const test=require('node:test'),assert=require('node:assert/strict'),bcrypt=require('bcryptjs');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const directional=require('../services/directionalPermissions.service');
test('directional grants never widen unrelated operations or directions',()=>{
 const p=[{resource:'audit.hr',action:'read',scope:'own'},{resource:'audit.service',action:'read',scope:'assigned'},{resource:'audit.hr.analytics',action:'read',scope:'department'}];
 assert.equal(directional.scope(p,'audit','read','hr'),'own');assert.equal(directional.scope(p,'audit','read','standard'),null);
 assert.equal(directional.scope(p,'audit','create','hr'),null);assert.equal(directional.scope(p,'audit.analytics','read','hr'),'department');
 assert.equal(directional.scope(p,'audit.analytics','read','service'),null);assert.equal(directional.scope(p,'role','update'),null);assert.equal(directional.scope(p,'occupational_safety_audit','read'),null);
 assert.equal(directional.scope([{resource:'*',action:'*',scope:'all'}],'audit','read','hr'),'all');
});
test('administration API preserves membership, authenticates notifications, and secures password changes',async()=>withAuditFixture(async h=>{
 let r=await h.request('admin','POST','/departments',{name:'QA Department',description:'Isolated test'});assert.equal(r.status,201);const department=r.data.department;
 assert.equal(typeof department.id,'string');assert.equal((await h.request('admin','GET','/departments')).data.departments[0].id,department.id);
 assert.equal((await h.request('admin','PUT',`/users/${h.actors.peer._id}`,{departmentId:department.id,position:'Analyst'})).status,200);
 assert.equal((await h.request('admin','DELETE',`/departments/${department.id}`)).status,409);
 assert.equal((await h.request('admin','GET','/audit-notification')).status,200);
 assert.equal((await h.request('anonymous','GET','/audit-notification')).status,401);
 assert.equal((await h.request('admin','PATCH',`/users/${h.actors.admin._id}/status`,{isActive:false})).status,400);
 const assignedRole=await h.models.Role.findOne({key:'test_own'});
 assert.equal((await h.request('admin','PUT',`/roles/${assignedRole._id}`,{key:'renamed_role'})).status,409);
 assert.equal((await h.models.User.findById(h.actors.own._id)).role,'test_own');

 const old='Synthetic-old-456',next='Synthetic-new-789';await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{password:await bcrypt.hash(old,4)}});
 assert.equal((await h.request('peer','POST','/auth/change-password',{currentPassword:'wrong',newPassword:next})).status,400);
 assert.equal((await h.request('peer','POST','/auth/change-password',{currentPassword:old,newPassword:'short'})).status,400);
 assert.equal((await h.request('peer','POST','/auth/change-password',{currentPassword:old,newPassword:next,userId:String(h.actors.admin._id)})).status,200);
 assert.equal((await h.request('peer','GET','/auth/me')).status,401);
 assert.equal((await h.request('admin','GET','/auth/me')).status,200);
 assert.equal((await h.request('anonymous','POST','/auth/login',{email:h.actors.peer.email,password:old})).status,401);
 const signed=await h.request('anonymous','POST','/auth/login',{email:h.actors.peer.email,password:next});assert.equal(signed.status,200);assert.equal('password' in signed.data.user,false);
 const stored=await h.models.User.findById(h.actors.peer._id).select('+password +credentialVersion');assert.notEqual(stored.password,next);assert.equal(stored.credentialVersion,1);
 h.tokens.peer=signed.data.token;assert.equal((await h.request('peer','GET','/auth/me')).status,200);
}));
test('directional role API denies foreign records and keeps per-direction ownership scopes',async()=>withAuditFixture(async h=>{
 const own=await h.audit('own','hr'),foreign=await h.audit('foreign','hr'),service=await h.audit('own','service');
 await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[{resource:'audit.hr',action:'read',scope:'own'},{resource:'audit.hr.analytics',action:'read',scope:'own'}]}});
 const listed=await h.request('own','GET','/audits');assert.equal(listed.status,200);assert.deepEqual(listed.data.map(a=>a.id),[own.id]);
 assert.equal((await h.request('own','GET',`/audits/${foreign.id}`)).status,404);
 assert.equal((await h.request('own','GET',`/audits/${service.id}`)).status,404);
 assert.equal((await h.request('own','GET','/audit-service/list')).status,403);
 assert.equal((await h.request('own','POST','/audit-hr/audits',{})).status,403);
 assert.equal((await h.request('own','GET','/roles')).status,403);
}));
