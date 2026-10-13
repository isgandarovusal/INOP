const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
test('Scores totals preserve scope, filters and the large-cohort fallback',async()=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:{$each:[{resource:'application',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'own'}]}}});
 const owned=actor=>({createdBy:h.actors[actor]._id,departmentId:h.actors[actor].departmentId});
 const c=await Candidate.create({name:'Synthetic count fixture',role:'Cashier',...owned('own')});
 const jobs=await Job.insertMany([{title:'Own KFC',description:'Synthetic',department:'HR',brandId:'kfc',...owned('own')},{title:'Own Pizza',description:'Synthetic',department:'HR',brandId:'pizza-hut',...owned('own')},{title:'Foreign KFC',description:'Synthetic',department:'HR',brandId:'kfc',...owned('foreign')}]);
 await Application.insertMany(jobs.map((job,i)=>({jobId:job._id,candidateId:c._id,status:i===1?'Interview':'Applied',source:{key:'manual'},createdAt:new Date('2026-01-01T12:00:00Z'),...owned('own')})));
 const scores=async(actor,q='')=>{const r=await h.request(actor,'GET','/hr/analytics/scores'+q);assert.equal(r.status,200);assert.equal(r.data.consistent,true);return r.data;};
 const all=await scores('admin');assert.equal(all.total,3);const own=await scores('own');assert.equal(own.total,2);assert.equal(own.scores.states.restricted,2);
 assert.equal((await scores('own','?brandId=kfc')).total,1);assert.equal((await scores('own','?status=Interview')).total,1);assert.equal((await scores('own','?source=outlook')).total,0);assert.equal((await scores('own','?from=2026-02-01')).total,0);assert.equal((await scores('own','?jobId='+jobs[2]._id)).total,0);
 const invalid=await h.request('own','GET','/hr/analytics/scores?from=2026-11-01&to=2026-01-01');assert.equal(invalid.status,400);
 await Job.insertMany(Array.from({length:501},(_,i)=>({title:'Synthetic fallback '+i,description:'Synthetic',department:'HR',...owned('own')})));
 const fallback=await scores('own');assert.equal(fallback.total,2);assert.equal(fallback.scores.states.restricted,2);
}));
