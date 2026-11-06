const test=require('node:test'),assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs');
const Application=require('../models/application.model'),Job=require('../models/job.model'),Candidate=require('../models/candidate.model');
test('Personal workload counts authorized assignments with explicit windows, not other recruiters or hidden parents',async()=>withAuditFixture(async h=>{
 const owner={createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id,departmentId:'dep_A'},job=await Job.create({title:'Workload vacancy',description:'Synthetic',department:'HR',...owner}),candidate=await Candidate.create({name:'Synthetic workload',role:'Cashier',cvReview:{version:'rules-2',reviewStatus:'pending'},...owner});
 const now=Date.now(),old=new Date(now-20*86400000);
 await Application.create({jobId:job._id,candidateId:candidate._id,...owner,status:'Interview',createdAt:old,stageEnteredAt:old,nextAction:{kind:'follow_up',dueAt:new Date(now-86400000)},interview:{startsAt:new Date(now+86400000),result:'pending',timezone:'Asia/Baku'}});
 await Application.create({jobId:job._id,candidateId:candidate._id,...owner,status:'Hired',stageEnteredAt:new Date(now-86400000)});
 await Application.create({jobId:job._id,candidateId:candidate._id,...owner,assignedTo:h.actors.own._id,status:'Applied'});
 const r=await h.request('admin','GET','/hr/analytics/operations');assert.equal(r.status,200);assert.ok(r.data.workload,'operations must expose personal workload');
 assert.equal(r.data.workload.assigned,2);assert.equal(r.data.workload.active,1);assert.equal(r.data.workload.pendingReviews,1);assert.equal(r.data.workload.overdue,1);assert.equal(r.data.workload.upcomingInterviews,1);assert.equal(r.data.workload.completed,1);assert.equal(r.data.workload.aging,1);assert.equal(r.data.workload.scope,'assigned-to-me');
 assert.ok(!JSON.stringify(r.data.workload).includes('Synthetic'));assert.equal((await h.request('anonymous','GET','/hr/analytics/operations')).status,401);
}));
