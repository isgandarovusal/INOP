const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Candidate=require('../models/candidate.model'),Log=require('../models/activityLog.model');
test('Generic activity logs retain Audit visibility but require current HR parent access for HR descriptions',async t=>withAuditFixture(async h=>{
 const foreign=await Candidate.create({name:'Private HR candidate',role:'Cashier',createdBy:h.actors.foreign._id,assignedTo:h.actors.foreign._id,departmentId:'dep_B'});
 const own=await Candidate.create({name:'Owned HR candidate',role:'Cashier',createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A'});
 await Log.create([{action:'update',entityType:'candidate',entityId:String(foreign._id),description:'Private HR candidate data'},{action:'update',entityType:'candidate',entityId:String(own._id),description:'Owned HR candidate data'},{action:'update',entityType:'candidate',entityId:'invalid-id',description:'Unverified HR description'},{action:'update',entityType:'audit',entityId:'audit-synthetic',description:'Independent audit data'}]);
 await h.models.User.updateOne({_id:h.actors.auditor._id},{departmentId:'dep_audit'});
 await h.models.Role.updateOne({key:'auditor'},{permissions:[{resource:'*',action:'*',scope:'all'}]});
 await t.test('Non-HR wildcard actor cannot read any HR log, unrelated Audit retained',async()=>{
  const r=await h.request('auditor','GET','/activity-logs');assert.equal(r.status,200);assert.deepEqual(r.data.activityLogs.map(v=>v.description),['Independent audit data']);
 });
 for(const scope of ['own','department','assigned'])await t.test(`HR ${scope} parent permission does not become activity_log.all`,async()=>{
  await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'activity_log',action:'read',scope:'all'},{resource:'candidate',action:'read',scope}]});
  const r=await h.request('own','GET','/activity-logs');assert.equal(r.status,200);assert.deepEqual(r.data.activityLogs.map(v=>v.description).sort(),['Independent audit data','Owned HR candidate data']);
 });
 await t.test('Missing current parent or resource grant redacts historical private descriptions',async()=>{
  await h.models.Role.updateOne({key:'test_own'},{permissions:[{resource:'activity_log',action:'read',scope:'all'}]});
  assert.deepEqual((await h.request('own','GET','/activity-logs')).data.activityLogs.map(v=>v.description),['Independent audit data']);
 });
 await t.test('Admin preserves complete activity visibility including deleted legacy parents',async()=>{
  assert.equal((await h.request('admin','GET','/activity-logs')).data.activityLogs.length,4);
 });
}));
