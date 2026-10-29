const test=require('node:test'),assert=require('node:assert/strict');
const{withAuditFixture}=require('./helpers/auditFixture.cjs');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
test('Candidate vacancy lookup does not re-read an empty aggregate result, while parent authority and counts remain',async t=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:['candidate','application','recruitment'].map(resource=>({resource,action:'read',scope:'own'}))}});
 const owner={createdBy:h.actors.own._id,departmentId:'dep_A'},job=await Job.create({title:'Synthetic job',description:'Synthetic duties',department:'HR',...owner});
 let operations=[];h.mongoose.set('debug',(c,m)=>operations.push(c+'.'+m));
 const read=async(suffix='',actor='own')=>{operations=[];const r=await h.request(actor,'GET','/hr/v2/candidates?excludeJobId='+job._id+suffix);return{r,ops:[...operations]};};
 try{
  await t.test('empty initial and search results keep Job existence check but skip empty Candidate find',async()=>{for(const q of ['', '&q=nomatch']){const{r,ops}=await read(q);assert.equal(r.status,200);assert.equal(r.data.total,0);assert.deepEqual(r.data.items,[]);assert.equal(r.data.hasMore,false);assert.ok(ops.includes('jobs.findOne'));assert.ok(ops.includes('candidates.aggregate'));assert.ok(!ops.includes('candidates.find'));}});
  const c1=await Candidate.create({name:'Synthetic one',role:'Cashier',...owner}),c2=await Candidate.create({name:'Synthetic two',role:'Cashier',...owner});
  await t.test('populated pages still re-read scoped projection in stable order and retain global total',async()=>{const a=await read('&pageSize=1');assert.equal(a.r.data.total,2);assert.equal(a.r.data.items.length,1);assert.equal(a.r.data.hasMore,true);assert.ok(a.ops.includes('candidates.find'));const b=await read('&pageSize=1&page=2');assert.equal(b.r.data.total,2);assert.equal(b.r.data.hasMore,false);assert.notEqual(a.r.data.items[0]._id,b.r.data.items[0]._id);const c=await read('&page=3');assert.equal(c.r.data.total,2);assert.deepEqual(c.r.data.items,[]);assert.ok(!c.ops.includes('candidates.find'));});
  await Application.create({jobId:job._id,candidateId:c1._id,...owner});await Application.create({jobId:job._id,candidateId:c2._id,...owner});
  await t.test('all linked Candidates yield zero while the readable-link anti-join stays enforced',async()=>{const{r,ops}=await read();assert.equal(r.status,200);assert.equal(r.data.total,0);assert.deepEqual(r.data.items,[]);assert.ok(!ops.includes('candidates.find'));});
  await t.test('unreadable parent and same-token permission revocation are not converted to empty success',async()=>{await Job.updateOne({_id:job._id},{createdBy:h.actors.foreign._id});assert.equal((await read()).r.status,404);await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[]}});assert.equal((await read()).r.status,403);assert.equal((await read('','anonymous')).r.status,401);});
 }finally{h.mongoose.set('debug',false);}
}));
