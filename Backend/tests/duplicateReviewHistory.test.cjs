const test=require('node:test'),assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs'),Candidate=require('../models/candidate.model'),Review=require('../models/candidateDuplicateReview.model');
test('Duplicate review history is independently scoped, paginated and marks outdated evidence',{timeout:30000},async()=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:{resource:'candidate',action:'*',scope:'own'}}});
 const owner={createdBy:h.actors.own._id,assignedTo:h.actors.own._id,departmentId:'dep_A'},a=await Candidate.create({name:'Synthetic original',role:'QA',email:'pair@example.test',...owner}),b=await Candidate.create({name:'Synthetic peer',role:'QA',email:a.email,...owner});
 const list=await h.request('own','GET','/candidates/'+a._id+'/duplicates'),item=list.data.items[0],pair=[a,b].sort((x,y)=>String(x._id).localeCompare(String(y._id))),fingerprints=pair.map(c=>String(c._id)===String(a._id)?list.data.revision:item.revision);
 await Review.insertMany(Array.from({length:12},(_,i)=>({pair:pair.map(c=>c._id),fingerprints,actor:h.actors.own._id,commandId:'synthetic-command-'+i,decision:'uncertain',note:'Synthetic historical decision '+i})));
 const url='/candidates/'+a._id+'/duplicate-reviews?otherId='+b._id;
 const r=await h.request('own','GET',url+'&page=1&limit=5');assert.equal(r.status,200);assert.equal(r.data.total,12);assert.equal(r.data.items.length,5);assert.equal(r.data.hasMore,true);assert.ok(r.data.items.every(v=>v.current&&v.actorId===String(h.actors.own._id)));
 const second=await h.request('own','GET',url+'&page=2&limit=5');assert.equal(second.status,200);assert.ok(!second.data.items.some(v=>r.data.items.some(x=>x.id===v.id)));
 await Candidate.updateOne({_id:b._id},{$set:{role:'Changed'}});const stale=await h.request('own','GET',url);assert.ok(stale.data.items.every(v=>v.current===false));assert.equal(await Review.countDocuments(),12);
 for(const q of ['&page=0','&limit=201','&otherId[$ne]=x'])assert.equal((await h.request('own','GET',url+q)).status,400);
 await Candidate.updateOne({_id:b._id},{$set:{createdBy:h.actors.foreign._id,assignedTo:h.actors.foreign._id,departmentId:'dep_B'}});assert.equal((await h.request('own','GET',url)).status,404);
}));
