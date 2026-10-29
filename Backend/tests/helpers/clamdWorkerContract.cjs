// Synthetic persistence/authority stubs; real production service control flow.
// This is NOT a database, route authorization or storage integration test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
function load(file,deps){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../..',file),'utf8'),{module,exports:module.exports,require:id=>{if(Object.hasOwn(deps,id))return deps[id];if(id.startsWith('node:'))return require(id);throw Error('Unexpected QA dependency');},Buffer,AbortController,setTimeout,clearTimeout,console:{error:()=>{throw Error('Unexpected controller logging');}}});return module.exports;}
async function workerRescan(scanner,sample){
 const hash=crypto.createHash('sha256').update(sample.bytes).digest('hex');let scans=0,parsed=0,claimed=false;
 const wrapped={scan:async(...args)=>{scans++;return scanner.scan(...args);}};
 await wrapped.scan(sample.bytes,{sha256:hash,mimeType:sample.mimeType});
 const row={_id:'synthetic-source',createdBy:'synthetic-actor',state:'queued',taskVersion:'intake-rules-1',attempts:1,original:{size:sample.bytes.length,sha256:hash,mimeType:sample.mimeType,originalName:'synthetic.pdf'},blob:{},updatedAt:new Date()};
 const query=value=>({select(){return this;},maxTimeMS(){return this;},lean:async()=>value});
 const Source={collection:{indexes:async()=>[
  {name:'hr_intake_command_unique',key:{commandKey:1},unique:true},
  {name:'hr_intake_queue_slot',key:{queueSlot:1},unique:true,partialFilterExpression:{queueSlot:{$type:'number'}}},
  {name:'hr_intake_actor_slot',key:{createdBy:1,actorSlot:1},unique:true,partialFilterExpression:{actorSlot:{$type:'number'}}},
 ]},updateMany:async()=>{},findOne:()=>query(row),findOneAndUpdate(_filter,update){if(claimed)return query(null);claimed=true;Object.assign(row,update.$set);return query(row);},async updateOne(_filter,update){Object.assign(row,update.$set);return{matchedCount:1};}};
 const deps={mongoose:{},'../models/hrCvIntake.model':Source,'../models/user.model':{findOne:()=>query({_id:'synthetic-actor',role:'synthetic'})},'../models/role.model':{findOne:()=>query({permissions:{}})},'./hrCreateRecovery.service':{identity:()=> 'synthetic'},'./hrResourceScope.service':{resourceFilter:()=>({})},'./hrPrivateObjectStorage.service':{reference:x=>x},'./documentWorkerPool.service':{},'./uploadContent.service':{},'./cvParser.service':{},'./hrCvIntakeScope.service':{checkLinked:async()=>{}},'./hrCvSourceReview.service':{createDuplicates:()=>{}},'./hrCvIntakeList.service':{createList:()=>{}},'./hrCvIntakeRetry.service':{createRetry:()=>{}},'./hrCvIntakeApproval.service':{createApproval:()=>({})}};
 const intake=load('services/hrCvIntake.service.js',deps).createIntake({enabled:true,evidenceMode:'test',scanBeforePersistence:true,scanner:wrapped,store:{get:async()=>Buffer.from(sample.bytes),put:async()=>{throw Error('No write allowed');}},parse:async()=>{assert.equal(scans,2);parsed++;return{text:'synthetic',parsed:{extraction:{version:'rules-2',provider:'rule-based'}}};}});
 assert.equal((await intake.runOnce(1)).processed,1);assert.equal(scans,2);assert.equal(parsed,1);assert.equal(row.state,'ready');
}
async function legacyClosed(scanner,sample){let parsed=0;const controller=load('controllers/cv.controller.js',{'../services/cvParser.service':{parseCvResultFromBuffer:async()=>{parsed++;throw Error('Must not parse');}},'../services/hrCvIntakeProfiles.service':{scanner:()=>scanner}});
 const res={status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};await controller.parseCv({file:{buffer:sample.bytes,mimetype:sample.mimeType,originalname:'synthetic.pdf'}},res);assert.equal(res.statusCode,503);assert.equal(res.body.code,'INTAKE_SCAN_REQUIRED');assert.equal(parsed,0);
}
module.exports={workerRescan,legacyClosed};
