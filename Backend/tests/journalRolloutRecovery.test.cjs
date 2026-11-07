const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const cli=path.resolve(__dirname,'../scripts/duplicateJournalIndex.cjs');
const invoke=(args,uri,preload)=>spawnSync(process.execPath,[...(preload?['--require',preload]:[]),cli,...args],{env:{PATH:process.env.PATH,...(uri?{MONGO_URI:uri}:{})},encoding:'utf8',timeout:15000,maxBuffer:65536});
test('failed configuration does not create a misleading receipt',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inop-journal-'));const receipt=path.join(dir,'receipt.json');assert.notEqual(invoke(['apply','--writers-paused',receipt]).status,0);await assert.rejects(fs.stat(receipt),{code:'ENOENT'});});
test('real Mongo scalar identity validation and bounded CLI lifecycle',{timeout:60000},async t=>withAuditFixture(async h=>{
 const db=h.mongoose.connection.db,c=db.collection('candidateduplicatereviews'),actor=h.actors.admin._id;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'inop-journal-')),receipt=path.join(dir,'receipt.json'),uri=`mongodb://127.0.0.1:27018/${db.databaseName}?directConnection=true`;
 await t.test('array identities are malformed and cannot produce a rollout receipt',async()=>{
  await c.insertMany([{actor:[actor],commandId:'array-actor'},{actor,commandId:['array-command']}]);
  const inspect=invoke(['inspect'],uri);assert.equal(inspect.status,0,inspect.stderr);assert.equal(JSON.parse(inspect.stdout).malformed,2);
  assert.notEqual(invoke(['apply','--writers-paused',receipt],uri).status,0);await assert.rejects(fs.stat(receipt),{code:'ENOENT'});
 });
 await t.test('conflict-free apply verify rollback preserves every document',async()=>{
  // Only this fixture owns this fresh database; replace its two synthetic malformed rows.
  await c.deleteMany({});await c.insertMany([{actor,commandId:'safe-1'},{actor,commandId:'safe-2'}]);const before=await c.find().sort({_id:1}).toArray();
  const preload=path.join(dir,'fail-before-ddl.cjs');
  await fs.writeFile(preload,'require('+JSON.stringify(path.resolve(__dirname,'../services/duplicateJournalIndex.service.js'))+').apply=async()=>{throw Error("Injected before DDL")};');
  assert.notEqual(invoke(['apply','--writers-paused',receipt],uri,preload).status,0);await assert.rejects(fs.stat(receipt),{code:'ENOENT'});
  const applied=invoke(['apply','--writers-paused',receipt],uri);assert.equal(applied.status,0,applied.stderr);assert.equal(JSON.parse(invoke(['inspect'],uri).stdout).ready,true);
  assert.equal(invoke(['rollback','--writers-paused',receipt],uri).status,0);assert.equal(JSON.parse(invoke(['inspect'],uri).stdout).ready,false);assert.deepEqual(await c.find().sort({_id:1}).toArray(),before);
  assert.notEqual(invoke(['apply','--writers-paused',receipt],uri).status,0,'never overwrite a prior receipt');assert.equal(JSON.parse(invoke(['inspect'],uri).stdout).ready,false);
 });
}));
