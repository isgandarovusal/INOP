const {test}=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const {indexes,inspect}=require('../services/auditIndexPlan.service');

test('Seven approved nonunique index shapes preserve scoped results, explain usage and rollback on an owned test DB',async()=>withAuditFixture(async h=>{
 const db=h.mongoose.connection.db,allowed=new h.mongoose.Types.ObjectId(),foreign=new h.mongoose.Types.ObjectId(),revision=new h.mongoose.Types.ObjectId();
 const collections=new Map(),rows=[];
 for(const spec of indexes){
  if(!collections.has(spec.model)){
   const collection=db.collection('stage3_index_'+spec.model);
   const documents=Array.from({length:200},(_,i)=>({_id:new h.mongoose.Types.ObjectId(),auditId:i%2?foreign:allowed,templateRevisionId:revision,restaurantId:i%2?'foreign-restaurant':'allowed-restaurant',hseObjectId:i%2?'foreign-office':'allowed-office',auditType:'standard',archivedAt:null,date:'2026-10-19',status:'completed',updatedAt:new Date('2026-10-19'),dueDate:new Date('2026-10-20')}));
   await collection.insertMany(documents);collections.set(spec.model,{collection,documents});
  }
  const {collection,documents}=collections.get(spec.model),ids=documents.filter((_,i)=>i%2===0).map(d=>d._id);
  const filter=spec.model==='audit'?{auditType:'standard',archivedAt:null,date:{$gte:'2026-10-01',$lte:'2026-10-31'},_id:{$in:ids},...(spec.key.restaurantId?{restaurantId:'allowed-restaurant'}:{}),...(spec.key.hseObjectId?{hseObjectId:'allowed-office'}:{})}:{auditId:allowed,...(spec.key.templateRevisionId?{templateRevisionId:revision}:{}),...(spec.key.status?{status:'completed'}:{}),...(spec.key.dueDate?{dueDate:{$lte:new Date('2026-10-21')}}:{})};
  const result=hint=>collection.find(filter).hint(hint).sort({_id:1}).map(d=>String(d._id)).toArray();
  const baseline=await result({$natural:1}),before=await collection.indexes();assert.equal(baseline.length,100);
  assert.ok(!before.some(i=>i.name===spec.name));
  try{
   await collection.createIndex(spec.key,{name:spec.name});
   const first=await collection.indexes();await collection.createIndex(spec.key,{name:spec.name});assert.deepEqual(await collection.indexes(),first);
   assert.deepEqual(await result(spec.name),baseline);
   const explained=await collection.find(filter).hint(spec.name).explain('executionStats');
   assert.ok(JSON.stringify(explained.queryPlanner.winningPlan).includes(spec.name));assert.equal(explained.executionStats.nReturned,100);
   const inventory=Object.fromEntries(indexes.map(i=>[i.model,[]]));inventory[spec.model]=first;
   const item=inspect(inventory).indexes.find(i=>i.name===spec.name);assert.equal(item.status,'PASS');assert.equal(item.action,'no-op');
   inventory[spec.model]=[{name:spec.name,key:{unrelated:1}}];assert.equal(inspect(inventory).indexes.find(i=>i.name===spec.name).status,'BLOCKED');
   rows.push({index:spec.name,returned:explained.executionStats.nReturned,keysExamined:explained.executionStats.totalKeysExamined,documentsExamined:explained.executionStats.totalDocsExamined,resultEquality:true});
  }finally{await collection.dropIndex(spec.name);}
  assert.deepEqual(await result({$natural:1}),baseline);assert.deepEqual(await collection.indexes(),before);
 }
 console.log(JSON.stringify({scenario:'seven synthetic index explain/result-equality/rollback checks',productionAccess:false,rows}));
}));
