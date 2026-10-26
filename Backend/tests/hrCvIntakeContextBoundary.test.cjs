const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const jobId='1'.repeat(24),branchId='2'.repeat(24);
function fixture(job,locationError){
 const seen={locations:[]},module={exports:{}};
 const catalog={brands:async()=>[{id:'kfc',active:true}],validateLocation:async(req,location)=>{seen.locations.push(location);return locationError;}};
 const deps={mongoose:{isObjectIdOrHexString:v=>/^[a-f0-9]{24}$/.test(v)},'../models/job.model':{findOne:q=>{seen.query=q;return{select:()=>({maxTimeMS:()=>({lean:async()=>job})})};}},'./hrResourceScope.service':{resourceFilter:()=>({assignedTo:'synthetic-actor'})},'./recruitmentCatalog.service':catalog};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../services/hrCvIntakeContext.service.js'),'utf8'),{module,exports:module.exports,require:id=>{assert.ok(id in deps,id);return deps[id];}});
 return{service:module.exports,seen};
}
test('Intake revalidates inferred Job brand/branch, retaining current scope and open-vacancy filter',async t=>{
 for(const reason of ['inactive branch','foreign branch','brand mismatch','inactive brand'])await t.test(reason,async()=>{
  const f=fixture({_id:jobId,brandId:'kfc',branchId},reason);
  await assert.rejects(f.service.validate({}, {jobId}),{code:'INTAKE_CONTEXT_INPUT'});
  assert.equal(f.seen.locations.length,1);assert.equal(f.seen.locations[0].branchId,branchId);
 });
 const f=fixture({_id:jobId,brandId:'kfc',branchId},null),result=await f.service.validate({}, {jobId});
 assert.equal(result.brandId,'kfc');assert.equal(result.branchId,branchId);
 assert.equal(f.seen.query.$and[0].status,'Open');assert.equal(f.seen.query.$and[0].archivedAt,null);assert.equal(f.seen.query.$and[1].assignedTo,'synthetic-actor');
 await assert.rejects(fixture(null).service.validate({}, {jobId}),{code:'INTAKE_CONTEXT_INPUT'});
 await assert.rejects(f.service.validate({}, {jobId,branchId:'3'.repeat(24)}),{code:'INTAKE_CONTEXT_INPUT'});
 const legacy=fixture({_id:jobId},null);assert.equal((await legacy.service.validate({}, {jobId})).jobId,jobId);assert.equal(legacy.seen.locations.length,0);
 assert.equal(await legacy.service.validate({},undefined),undefined);
});
