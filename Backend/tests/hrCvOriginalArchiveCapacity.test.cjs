const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const source=path.join(__dirname,'../services/hrCvOriginalArchive.service.js'),base=createRequire(source),hash=value=>crypto.createHash('sha256').update(value).digest('hex'),turn=()=>new Promise(r=>setImmediate(r));
async function fixture({afterExists=()=>{}}={}){
 const bytes=Buffer.from('Synthetic original only'),rows=[],timers=new Map();let serial=0,timerId=0,scans=0,puts=0;
 const req={user:{id:'1'.repeat(24)}},fingerprint=c=>hash(String(c._id));
 const candidate=id=>({_id:id,cvUrl:'/uploads/synthetic.pdf',cvOriginal:{sha256:hash(bytes),size:bytes.length,mimeType:'application/pdf'},__v:0});
 const q=value=>({select(){return this;},maxTimeMS(){return this;},lean:async()=>value});
 function matches(row,filter){return Object.entries(filter).every(([key,wanted])=>{
  if(key==='$or')return wanted.some(choice=>matches(row,choice));
  const value=row[key];if(wanted&&typeof wanted==='object'&&!(wanted instanceof Date))return Object.entries(wanted).every(([op,item])=>op==='$lt'?value<item:op==='$gte'?value>=item:op==='$lte'?value<=item:op==='$gt'?value>item:op==='$in'?item.includes(value):op==='$exists'?(value!==undefined)===item:op==='$ne'?value!==item:false);
  return String(value)===String(wanted);
 });}
 const Manifest={collection:{indexes:async()=>[{name:'hr_original_context_unique',unique:true,key:{contextKey:1}},{name:'hr_original_active_slot',unique:true,key:{slot:1},partialFilterExpression:{slot:{$type:'number'}}}]},findOne:filter=>q(rows.find(row=>matches(row,filter))),create:async payload=>{const row={_id:String(++serial).padStart(24,'0'),attempts:0,...payload};rows.push(row);return{toObject:()=>({...row})};},exists:async filter=>{const present=rows.some(row=>matches(row,filter));afterExists();return present;},findOneAndUpdate:(filter,change)=>{
  const row=rows.find(row=>matches(row,filter));if(!row)return q(null);
  if(change.$set?.slot!==undefined&&rows.some(other=>other!==row&&other.slot===change.$set.slot))throw Object.assign(Error('Synthetic slot conflict'),{code:11000});
  Object.assign(row,change.$set);for(const key of Object.keys(change.$unset||{}))delete row[key];for(const [key,n]of Object.entries(change.$inc||{}))row[key]=(row[key]||0)+n;return q({...row});
 }};
 const deps={'mongoose':{isObjectIdOrHexString:value=>typeof value==='string'&&/^[a-f0-9]{24}$/.test(value)},'../models/hrCvOriginalManifest.model':Manifest,'../models/candidate.model':{findOne:filter=>q(candidate(filter.$and[0]._id))},'../models/user.model':{findOne:()=>q({_id:req.user.id,role:'synthetic',departmentId:'synthetic'})},'../models/role.model':{findOne:()=>q({permissions:[]})},'./hrResourceScope.service':{resourceFilter:()=>({})},'./hrCvProcessing.service':{fingerprint},'./hrPrivateObjectStorage.service':{MAX_BYTES:5*1024*1024,prepare:()=>({key:'synthetic-object',sha256:hash(bytes),size:bytes.length,mimeType:'application/pdf'}),reference:value=>value},'../controllers/privateFiles.controller':{readCandidateOriginal:async()=>bytes}};
 const module={exports:{}};vm.runInNewContext(await fs.readFile(source,'utf8'),{module,exports:module.exports,require:id=>deps[id]||base(id),Buffer,AbortController,Date,Object,JSON,setTimeout:callback=>{timers.set(++timerId,callback);return timerId;},clearTimeout:id=>timers.delete(id)});
 const objects=new Map(),options={enabled:true,evidenceMode:'test',read:async()=>bytes,slot:()=>0,scanner:{scan:async()=>{scans++;return{verdict:'clean',sha256:hash(bytes),engine:'synthetic-only',version:'1'};}},store:{get:async ref=>{if(!objects.has(ref.key))throw Object.assign(Error('Synthetic absent'),{code:'STORAGE_NOT_FOUND'});return objects.get(ref.key);},put:async(ref,value)=>{puts++;objects.set(ref.key,value);}}};
 const run=(service,id)=>service.archive(req,id,{expectedRevision:0,sourceHash:hash(bytes),contextHash:fingerprint(candidate(id))});
 return{createArchive:module.exports.createArchive,options,run,timers,bytes,rows,counts:()=>({scans,puts})};
}
test('Archive capacity is shared across instances and held through actual ignored reads after deadlines',async()=>{
 const f=await fixture(),releases=[];let reads=0;const first=f.createArchive(f.options),known='a'.repeat(24),verified=await f.run(first,known);assert.equal(verified.state,'verified');
 const baseline=f.counts();
 try{
  for(let i=0;i<8;i++){
   const receiver=f.createArchive({...f.options,timeoutMs:10,read:async()=>{reads++;return new Promise(resolve=>releases.push(()=>resolve(f.bytes)));}}),pending=f.run(receiver,String(i+100).padStart(24,'0'));
   await turn();assert.equal(reads,i+1);for(const cb of [...f.timers.values()])cb();const result=await pending;assert.equal(result.code,'ARCHIVE_TIMEOUT');assert.equal(result.state,'retry');
  }
  assert.equal((await f.run(first,known)).replayed,true,'Capacity must not block metadata-only terminal replay');
  await assert.rejects(f.run(f.createArchive(),known),{code:'ARCHIVE_DISABLED'});
  const overflow=f.run(f.createArchive({...f.options,read:async()=>{reads++;return new Promise(resolve=>releases.push(()=>resolve(f.bytes)));}}),'b'.repeat(24));
  // Before the fix this request starts a ninth native read. Trigger its caller
  // deadline so the regression fails deterministically instead of hanging.
  const outcome=overflow.then(value=>({value}),error=>({error}));await turn();for(const cb of [...f.timers.values()])cb();const result=await outcome;
  assert.equal(result.error?.code,'ARCHIVE_BUSY');assert.equal(reads,8);assert.deepEqual(f.counts(),baseline);
  releases.shift()();await turn();const recovered=await f.run(f.createArchive(f.options),'c'.repeat(24));assert.equal(recovered.state,'verified');assert.equal(reads,8,'Released aborted work must not start new reads');
 }finally{releases.forEach(release=>release());await turn();}
});
test('Archive failed reservation/configuration releases process capacity before any read',async()=>{
 const f=await fixture();let reads=0;for(let i=0;i<9;i++)await assert.rejects(f.run(f.createArchive({...f.options,slot:()=>9,read:async()=>{reads++;return f.bytes;}}),String(i+200).padStart(24,'0')),{code:'ARCHIVE_CONFIG'});
 assert.equal(reads,0);assert.equal((await f.run(f.createArchive(f.options),'d'.repeat(24))).state,'verified');
});

for(const terminal of ['verified','retry'])test(`Expired archive lease cannot commit ${terminal} after its final guard`,async()=>{
 let clock=new Date('2026-11-06T00:00:00Z'),checks=0;const f=await fixture({afterExists:()=>{if(++checks===(terminal==='verified'?6:4))clock=new Date(clock.getTime()+61000);}});
 const options={...f.options,now:()=>clock,...(terminal==='retry'?{store:{...f.options.store,put:async()=>{throw Error('Synthetic storage outage');}}}:{})};
 await assert.rejects(f.run(f.createArchive(options),'e'.repeat(24)),{code:'ARCHIVE_LEASE_LOST'});assert.equal(f.rows[0].state,'running');assert.equal(f.rows[0].verifiedAt,undefined);
 const recovered=await f.run(f.createArchive({...f.options,now:()=>clock}),'e'.repeat(24));assert.equal(recovered.state,'verified');assert.equal(recovered.attempts,2);
});
