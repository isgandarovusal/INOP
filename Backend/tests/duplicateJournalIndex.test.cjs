const test=require('node:test'),assert=require('node:assert/strict'),{withAuditFixture}=require('./helpers/auditFixture.cjs'),service=require('../services/duplicateJournalIndex.service');
test('Real Mongo duplicate-journal index rollout is conflict-safe, unique and reversible without data deletion',async()=>withAuditFixture(async h=>{
 const c=h.mongoose.connection.db.collection('synthetic_journal_rollout');const actor=h.actors.admin._id;
 await c.insertMany([{actor,commandId:'duplicate'},{actor,commandId:'duplicate'}]);
 const state=await service.inspect(c);assert.equal(state.conflicts.length,1);assert.ok(!JSON.stringify(state).includes('duplicate'));await assert.rejects(service.apply(c,{writersPaused:true}));assert.equal(await c.countDocuments(),2);
 // A second, clean collection models reviewed conflict resolution; no conflict
 // is silently deleted or rewritten by the migration procedure.
 const clean=h.mongoose.connection.db.collection('synthetic_clean_journal');await clean.insertOne({actor,commandId:'existing'});
 await assert.rejects(service.apply(clean));const receipt=await service.apply(clean,{writersPaused:true});assert.equal(receipt.created,true);assert.equal((await service.inspect(clean)).ready,true);
 const writes=await Promise.allSettled([clean.insertOne({actor,commandId:'concurrent'}),clean.insertOne({actor,commandId:'concurrent'})]);assert.equal(writes.filter(v=>v.status==='fulfilled').length,1);
 const preserved=await clean.find().toArray();await assert.rejects(service.rollback(clean,{...receipt,namespace:'wrong'},{writersPaused:true}));await service.rollback(clean,receipt,{writersPaused:true});assert.deepEqual(await clean.find().toArray(),preserved);
 await clean.createIndex({actor:1,commandId:1},{name:'actor_1_commandId_1'});assert.equal((await service.inspect(clean)).incompatible,true);await assert.rejects(service.apply(clean,{writersPaused:true}));
}));
