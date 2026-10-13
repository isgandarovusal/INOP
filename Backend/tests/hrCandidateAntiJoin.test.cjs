const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Candidate=require('../models/candidate.model'),Job=require('../models/job.model'),Application=require('../models/application.model');
test('Indexed candidate anti-join preserves readable-link scope, filters and exact pagination totals',async()=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:{$each:[{resource:'candidate',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'},{resource:'application',action:'read',scope:'own'}]}}});
 const job=await Job.create({title:'Synthetic candidate picker',description:'Synthetic only',department:'HR',createdBy:h.actors.admin._id});
 const people=await Candidate.insertMany(['A visible linked','B hidden linked','C unlinked'].map(name=>({name,role:'Cashier',createdBy:h.actors.own._id})));
 await Application.insertMany([{candidateId:people[0]._id,jobId:job._id,createdBy:h.actors.own._id},{candidateId:people[1]._id,jobId:job._id,createdBy:h.actors.foreign._id}]);
 const url='/hr/v2/candidates?excludeJobId='+job._id+'&sort=name&pageSize=1';
 const first=await h.request('own','GET',url);assert.equal(first.status,200);assert.equal(first.data.total,2);assert.equal(String(first.data.items[0]._id),String(people[1]._id));assert.equal(first.data.hasMore,true);
 const second=await h.request('own','GET',url+'&page=2');assert.equal(second.data.total,2);assert.equal(String(second.data.items[0]._id),String(people[2]._id));assert.equal(second.data.hasMore,false);
 const admin=await h.request('admin','GET',url);assert.equal(admin.data.total,1);assert.equal(String(admin.data.items[0]._id),String(people[2]._id));
 const filtered=await h.request('own','GET',url+'&q=unlinked');assert.equal(filtered.data.total,1);assert.equal(filtered.data.items.length,1);
 assert.equal((await h.request('none','GET',url)).status,403);
 assert.equal((await h.request('own','GET','/hr/v2/candidates?excludeJobId='+new h.mongoose.Types.ObjectId())).status,404);
}));
