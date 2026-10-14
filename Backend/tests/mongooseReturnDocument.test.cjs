const test=require('node:test'),assert=require('node:assert/strict');const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Mongoose after option preserves returned document, upsert, validators and scoped misses',async()=>withAuditFixture(async h=>{
 const name='ReturnDocumentParity',Model=h.mongoose.model(name,new h.mongoose.Schema({name:String,count:{type:Number,min:0},tenant:String},{timestamps:true}));
 const actual=[],warnings=[];const onWarning=w=>{if(w.message.includes('the `new` option'))warnings.push(w.message);};process.on('warning',onWarning);try{for(const options of[{new:true},{returnDocument:'after'}]){
  const warningStart=warnings.length;const row=await Model.create({name:'before',count:0,tenant:'local-only'});
  const updated=await Model.findOneAndUpdate({_id:row._id,tenant:'local-only'},{$set:{name:'after'},$inc:{count:1}},{...options,runValidators:true}).select('name count').lean();assert.equal(updated.name,'after');assert.equal(updated.count,1);assert.equal(updated.tenant,undefined);
  assert.equal(await Model.findOneAndUpdate({_id:row._id,tenant:'foreign'},{$set:{name:'forbidden'}},options),null);assert.equal((await Model.findById(row._id)).name,'after');
  await assert.rejects(Model.findByIdAndUpdate(row._id,{$set:{count:-1}},{...options,runValidators:true}),{name:'ValidationError'});
  const upsert=await Model.findOneAndUpdate({name:'upsert-'+actual.length},{$set:{count:2,tenant:'local-only'}},{...options,upsert:true,runValidators:true});assert.equal(upsert.count,2);assert.equal(upsert.tenant,'local-only');
  const byId=await Model.findByIdAndUpdate(row._id,{$set:{count:3}},options);assert.equal(byId.count,3);await new Promise(r=>setImmediate(r));if(options.new)assert.ok(warnings.length>warningStart);else assert.equal(warnings.length,warningStart);actual.push({name:updated.name,count:updated.count,byId:byId.count,upsert:upsert.count});
 }assert.deepEqual(actual[0],actual[1]);}finally{process.off('warning',onWarning);h.mongoose.deleteModel(name);}
}));
