const test=require('node:test');const assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Execution KPI uses canonical points, retains zero/legacy values, enforces parent scope',async t=>withAuditFixture(async h=>{
 const own=await h.audit('own'),foreign=await h.audit('foreign');
 await h.models.Execution.create({auditId:own._id,totalScore:0,status:'completed'});
 await h.models.Execution.create({auditId:own._id,totalScore:20,status:'completed'});
 await h.models.Execution.create({auditId:foreign._id,totalScore:100,status:'completed'});
 const Snapshot=require('../models/auditDepartmentSnapshot.model');
 await Snapshot.create({auditId:own._id,auditorId:own.auditorId,departmentId:'dep_A'});
 await Snapshot.create({auditId:foreign._id,auditorId:foreign.auditorId,departmentId:'dep_B'});
 await h.assign('assigned',foreign);
 for(const [actor,total,score]of[['own',2,10],['admin',3,40],['department',2,10],['assigned',1,100]])await t.test(actor+' scoped KPI',async()=>{
  const response=await h.request(actor,'GET','/audit-dashboard');assert.equal(response.status,200);
  assert.equal(response.data.data.completedAudits,total);assert.equal(response.data.data.averageScore,score);assert.equal(response.data.data.scoredExecutions,total);
 });
 await t.test('Empty scope is distinguishable from an actual zero score',async()=>{
  const empty=await h.request('peer','GET','/audit-dashboard');assert.equal(empty.data.data.averageScore,0);assert.equal(empty.data.data.scoredExecutions,0);
  await h.models.Execution.deleteOne({auditId:own._id,totalScore:20});
  const zero=await h.request('own','GET','/audit-dashboard');assert.equal(zero.data.data.averageScore,0);assert.equal(zero.data.data.scoredExecutions,1);
 });
 await t.test('Legacy execution score is read without a migration',async()=>{
  await h.models.Execution.collection.insertOne({auditId:own._id,score:40,status:'completed',createdAt:new Date()});
  const response=await h.request('own','GET','/audit-dashboard');assert.equal(response.data.data.averageScore,20);assert.equal(response.data.data.scoredExecutions,2);
 });
}));
