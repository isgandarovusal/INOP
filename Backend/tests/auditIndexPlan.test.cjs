const{test}=require('node:test'),assert=require('node:assert/strict');const{indexes,inspect}=require('../services/auditIndexPlan.service');
test('Index plan is read-only, idempotent, nonunique and refuses conflicting names/options',()=>{
 const input=Object.fromEntries([...new Set(indexes.map(i=>i.model))].map(m=>[m,[]]));const original=JSON.stringify(input),planned=inspect(input);assert.equal(planned.writes,0);assert.equal(planned.autoApply,false);assert.ok(planned.indexes.every(i=>i.status==='NOT TESTED'));assert.equal(JSON.stringify(input),original);
 for(const index of indexes)input[index.model].push({name:index.name,key:index.key});assert.ok(inspect(input).indexes.every(i=>i.status==='PASS'&&i.action==='no-op'));
 input.auditExecution[0].key={auditId:1};assert.equal(inspect(input).indexes[0].status,'BLOCKED');assert.ok(inspect({}).indexes.every(i=>i.status==='BLOCKED'));
});
