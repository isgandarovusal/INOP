const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const{withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Operator duplicate-journal default CLI is genuinely read-only and bounded on actual MongoDB',{timeout:20000},async t=>withAuditFixture(async h=>{
 const db=h.mongoose.connection.db,collection=db.collection(require('../models/candidateDuplicateReview.model').collection.name);
 const inspect=()=>{const p=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/duplicateJournalIndex.cjs')],{cwd:path.resolve(__dirname,'../..'),env:{PATH:process.env.PATH,MONGO_URI:`mongodb://127.0.0.1:27018/${db.databaseName}?directConnection=true`},encoding:'utf8',timeout:10000,maxBuffer:65536});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);};
 await t.test('inspection never creates an absent collection or index',async()=>{const before=await awaitCollections();assert.equal(before.includes(collection.collectionName),false);const result=inspect();assert.equal(result.ready,false);assert.equal(result.malformed,0);assert.deepEqual(result.conflicts,[]);assert.deepEqual(await awaitCollections(),before);});
 function awaitCollections(){return db.listCollections({},{nameOnly:true}).toArray().then(rows=>rows.map(r=>r.name).sort());}
 await t.test('large conflict set is truncated and sanitized without changing any record/index',async()=>{
  const actor=h.actors.admin._id;await collection.insertMany(Array.from({length:102},(_,i)=>[{actor,commandId:'private-fixture-command-'+i,note:'PRIVATE_FIXTURE_NOTE'},{actor,commandId:'private-fixture-command-'+i,note:'PRIVATE_FIXTURE_NOTE'}]).flat());
  const before=await collection.find().sort({_id:1}).toArray(),indexes=await collection.indexes(),result=inspect();assert.equal(result.ready,false);assert.equal(result.truncated,true);assert.equal(result.conflicts.length,100);assert.ok(result.conflicts.every(r=>r.count===2&&/^[a-f0-9]{64}$/.test(r.groupDigest)));assert.ok(!JSON.stringify(result).includes('PRIVATE_FIXTURE'));assert.ok(!JSON.stringify(result).includes('private-fixture-command'));assert.deepEqual(await collection.find().sort({_id:1}).toArray(),before);assert.deepEqual(await collection.indexes(),indexes);
 });
}));
