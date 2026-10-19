const{test}=require('node:test'),assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs'),{create,submit}=require('./helpers/reportFixture.cjs');
test('HR and Service source analytics exceed 5000 without truncation, preserve saved averages and scope, use pinned execution index',{timeout:240000},async()=>withAuditFixture(async h=>{
 const spec=require('../services/auditIndexPlan.service').indexes.find(i=>i.model==='auditExecution');await h.models.Execution.collection.createIndex(spec.key,{name:spec.name});
 for(const kind of ['hr','service']){
  const row=await create(h,kind,'simit-sarayi',false),done=await submit(h,row),parent=await h.models.Audit.findById(row.audit._id).lean(),execution=await h.models.Execution.findById(row.e._id).lean(),n=5001;
  for(let offset=1;offset<n;offset+=100){const parents=[],executions=[];for(let i=offset;i<Math.min(offset+100,n);i++){const id=new h.mongoose.Types.ObjectId();parents.push({...parent,_id:id,id:`p09-${kind}-${i}`});executions.push({...execution,_id:new h.mongoose.Types.ObjectId(),auditId:id});}await h.models.Audit.insertMany(parents);await h.models.Execution.insertMany(executions);}
  // A newer wrong-revision completed row must not replace a pinned historical result.
  await h.models.Execution.collection.insertOne({...execution,_id:new h.mongoose.Types.ObjectId(),templateRevisionId:new h.mongoose.Types.ObjectId(),updatedAt:new Date('2030-01-01'),overallPercentage:0});
  const before=process.memoryUsage().rss,started=performance.now(),r=await h.request('admin','GET',`/audit-${kind}/analytics`,undefined,{timeoutMs:30000});assert.equal(r.status,200,JSON.stringify(r.data));const d=r.data.data;
  assert.equal(d.total,n);assert.equal(d.submitted,n);assert.equal(d.scored,n);assert.equal(d.average,done.overallPercentage);assert.equal(d.nonconformities,2*n);assert.equal(d.criteria.reduce((s,q)=>s+q.count,0),n*row.answers.length);assert.equal(d.criteria.reduce((s,q)=>s+q.na,0),n*(row.answers.length-3));assert.equal(d.completeRange,true);assert.equal(d.aggregation,'server-side');
  assert.equal((await h.request('foreign','GET',`/audit-${kind}/analytics`)).data.data.total,0);
  const explain=await h.models.Execution.find({auditId:row.audit._id,templateRevisionId:execution.templateRevisionId,status:'completed'}).sort({updatedAt:-1,_id:-1}).limit(1).explain('executionStats');assert.ok(explain.executionStats.totalDocsExamined<=1);assert.match(JSON.stringify(explain.queryPlanner.winningPlan),/audit_source_latest_v1/);
  console.log(JSON.stringify({scenario:`${n} ${kind} audits`,criteria:n*row.answers.length,average:d.average,elapsedMs:Math.round(performance.now()-started),rssDeltaBytes:process.memoryUsage().rss-before,docsExamined:explain.executionStats.totalDocsExamined,index:spec.name}));
 }
}));
