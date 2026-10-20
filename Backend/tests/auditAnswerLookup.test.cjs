const {test}=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Read-only analytics lookup preserves historical first answers, N/A and missing answers in MongoDB',async()=>withAuditFixture(async h=>{
 const c=h.mongoose.connection.db.collection('synthetic_answer_lookup');
 await c.insertMany([[],[{questionId:'q1',answer:'na',score:null}],[{questionId:'q2',answer:'0.5',score:0.5},{questionId:'q1',answer:'0',score:0},{questionId:'q1',answer:'1',score:1}],null].map(answers=>({answers,questions:[{id:'q1'},{id:'q2'},{id:'q3'}]})));
 const previous={$arrayElemAt:[{$filter:{input:{$ifNull:['$answers',[]]},as:'a',cond:{$eq:['$$a.questionId','$$q.id']}}},0]};
 const indexed={$let:{vars:{index:{$indexOfArray:['$answerIds','$$q.id']}},in:{$cond:[{$gte:['$$index',0]},{$arrayElemAt:['$answers','$$index']},null]}}};
 const results=await c.aggregate([{$set:{answerIds:{$map:{input:{$ifNull:['$answers',[]]},as:'a',in:'$$a.questionId'}}}},{$project:{previous:{$map:{input:'$questions',as:'q',in:{$ifNull:[previous,null]}}},indexed:{$map:{input:'$questions',as:'q',in:indexed}}}}]).toArray();
 for(const row of results)assert.deepEqual(row.indexed,row.previous);
 assert.equal(results[1].indexed[0].answer,'na');assert.equal(results[2].indexed[0].answer,'0');assert.equal(results[2].indexed[2],null);
}));
