const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Job=require('../models/job.model'),Brand=require('../models/recruitmentBrand.model'),Branch=require('../models/recruitmentBranch.model');
test('Catalog decoration queries only nonempty ID batches, preserving current scoped branch names',async t=>withAuditFixture(async h=>{
 await h.models.Role.updateOne({key:'test_own'},{$push:{permissions:[{resource:'recruitment',action:'read',scope:'own'}]}});
 let operations=[];h.mongoose.set('debug',(c,m)=>operations.push(c+'.'+m));
 const read=async(actor,url)=>{operations=[];const r=await h.request(actor,'GET',url);return{r,ops:[...operations]};};
 try{
  await t.test('empty job page performs no catalog reads and keeps exact count/page',async()=>{const{r,ops}=await read('admin','/hr/v2/jobs');assert.equal(r.status,200);assert.deepEqual(r.data.items,[]);assert.equal(r.data.total,0);assert.equal(r.data.hasMore,false);assert.ok(!ops.includes('recruitmentbrands.find'));assert.ok(!ops.includes('recruitmentbranches.find'));assert.ok(ops.includes('roles.findOne'));});
  const owner={createdBy:h.actors.own._id,departmentId:'dep_A'},job=await Job.create({title:'Synthetic vacancy',description:'Synthetic duties',department:'HR',...owner});
  await t.test('no brand/location preserves explicit null display fields without unrelated catalog reads',async()=>{const{r,ops}=await read('own','/jobs/'+job._id);assert.equal(r.status,200);assert.equal(r.data.brandName,null);assert.equal(r.data.branchName,null);assert.ok(!ops.includes('recruitmentbrands.find'));assert.ok(!ops.includes('recruitmentbranches.find'));});
  await Brand.create({_id:'synthetic-brand',name:'Synthetic brand'});await Job.updateOne({_id:job._id},{brandId:'synthetic-brand'});
  await t.test('custom brand still reads its name, absent branch skips only the empty branch batch',async()=>{const{r,ops}=await read('own','/jobs/'+job._id);assert.equal(r.data.brandName,'Synthetic brand');assert.equal(r.data.branchName,null);assert.equal(ops.filter(v=>v==='recruitmentbrands.find').length,1);assert.ok(!ops.includes('recruitmentbranches.find'));});
  const branch=await Branch.create({code:'synthetic',name:'Current branch name',kind:'restaurant',brandId:'synthetic-brand',...owner});await Job.updateOne({_id:job._id},{branchId:branch._id});
  await t.test('real references retain scoped/current batched reads; no catalog cache',async()=>{let result=await read('own','/jobs/'+job._id);assert.equal(result.r.data.branchName,'Current branch name');assert.equal(result.ops.filter(v=>v==='recruitmentbranches.find').length,1);await Branch.updateOne({_id:branch._id},{name:'Updated branch name'});result=await read('own','/jobs/'+job._id);assert.equal(result.r.data.branchName,'Updated branch name');await Branch.updateOne({_id:branch._id},{createdBy:h.actors.foreign._id,departmentId:'dep_B'});result=await read('own','/jobs/'+job._id);assert.equal(result.r.data.branchName,null);});
  await t.test('same-token grant revocation and unauthorized reads remain rejected',async()=>{await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:[]}});assert.equal((await read('own','/hr/v2/jobs')).r.status,403);assert.equal((await read('anonymous','/hr/v2/jobs')).r.status,401);});
 }finally{h.mongoose.set('debug',false);}
}));
