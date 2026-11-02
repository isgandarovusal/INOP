const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
const {calculateApplicationMatch}=require('../services/applicationMatch.service');
test('Assigned Application detail discloses only approved same-department context without parent authority',async t=>withAuditFixture(async h=>{
 for(const [a,role]of [['own','recruitment_employee'],['peer','recruitment_employee'],['department','recruitment_manager']])await h.models.User.updateOne({_id:h.actors[a]._id},{$set:{role,departmentId:'dep_hr'}});
 const fields={departmentId:'dep_hr',createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id};
 const job=await Job.create({...fields,title:'Context Cashier',department:'HR',description:'DO_NOT_EMIT',brandId:'kfc',requiredSkills:['Cash handling']}),candidate=await Candidate.create({...fields,name:'Synthetic Context Person',role:'Cashier',email:'context@example.invalid',phone:'+994500000000',skills:['Cash handling'],experience:2,education:'Vocational education',languages:['az'],certificates:['HACCP'],status:'new'});
 await Candidate.collection.updateOne({_id:candidate._id},{$set:{cvUrl:'DO_NOT_EMIT',privateCvBlob:{key:'DO_NOT_EMIT'},cvReview:{rawText:'DO_NOT_EMIT'},address:'DO_NOT_EMIT',birthDate:'DO_NOT_EMIT'}});
 const matching=calculateApplicationMatch(job,candidate,{application:{jobId:job._id,candidateId:candidate._id}});
 const app=await Application.create({...fields,assignedTo:h.actors.own._id,jobId:job._id,candidateId:candidate._id,matching,score:matching.score,scoreStatus:matching.scoreStatus});
 const path='/applications/'+app._id,read=actor=>h.request(actor,'GET',path);let baseline;
 await t.test('approved fields and current deterministic score, no general parent/read/edit/download/recalculate permission',async()=>{
  let operations=[];h.mongoose.set('debug',(c,m)=>operations.push(c+'.'+m));let r;try{r=await read('own');}finally{h.mongoose.set('debug',false);}baseline=operations.length;
  assert.equal(r.status,200);assert.equal(r.headers['cache-control'],'private, no-store');assert.equal(r.data.candidateId,null);assert.equal(r.data.jobId,null);assert.equal(r.data.scoreStatus,'restricted');
  const ctx=r.data.handoffContext;assert.ok(ctx,'handoff context missing');assert.equal(ctx.applicationId,String(app._id));assert.equal(ctx.revision,0);assert.equal(ctx.mode,'assigned-read-only');assert.equal(ctx.candidate.email,candidate.email);assert.equal(ctx.candidate.phone,candidate.phone);assert.equal(ctx.job.title,job.title);assert.equal(ctx.score,matching.score);assert.equal(ctx.matching.version,'ats-v2');
  assert.ok(!JSON.stringify(ctx).includes('DO_NOT_EMIT'));for(const key of ['_id','status','cvUrl','privateCvBlob','cvReview','address','birthDate','history','employmentHistory'])assert.equal(ctx.candidate[key],undefined);assert.equal(ctx.matching.jobHash,undefined);assert.equal(ctx.matching.candidateHash,undefined);
  for(const p of ['/candidates/'+candidate._id,'/jobs/'+job._id,'/candidates/'+candidate._id+'/cv'])assert.equal((await h.request('own','GET',p)).status,404);
  assert.equal((await h.request('own','PUT','/candidates/'+candidate._id,{name:'Forbidden',expectedRevision:0})).status,404);assert.equal((await h.request('own','PUT','/jobs/'+job._id,{title:'Forbidden'})).status,403);assert.equal((await h.request('own','POST',path+'/recalculate',{})).status,403);
  console.log(JSON.stringify({scenario:'context DB reads including auth',reads:baseline}));
 });
 await t.test('Admin and department Manager keep existing responses; other assignee and anonymous denied',async()=>{
  for(const a of ['admin','department']){const r=await read(a);assert.equal(r.status,200);assert.equal(r.data.candidateId.name,candidate.name);assert.equal(r.data.handoffContext,undefined);}
  assert.equal((await read('peer')).status,404);assert.equal((await read('anonymous')).status,401);assert.equal((await read('none')).status,403);
 });
 await t.test('empty assignment, noneligible role and foreign/missing departments never disclose context',async()=>{
  for(const patch of [{assignedTo:null},{departmentId:'other'},{departmentId:''}]){await Application.updateOne({_id:app._id},{$set:patch});const r=await read('own');assert.equal(r.data.handoffContext,undefined);await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.own._id,departmentId:'dep_hr'}});}
  for(const Model of [Candidate,Job]){await Model.updateOne({_id:Model===Job?job._id:candidate._id},{$set:{departmentId:'other'}});assert.equal((await read('own')).data.handoffContext,undefined);await Model.updateOne({_id:Model===Job?job._id:candidate._id},{$set:{departmentId:'dep_hr'}});}
  await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'hr_manager'}});assert.equal((await read('own')).data.handoffContext,undefined);await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee'}});
 });
 await t.test('only detail is expanded; lists, history and mutation responses do not gain context',async()=>{
  for(const p of ['/applications','/hr/v2/applications','/hr/v2/application-board',path+'/history']){const r=await h.request('own','GET',p);assert.ok(!JSON.stringify(r.data).includes('handoffContext'));}
  const r=await h.request('own','PATCH',path+'/status',{status:'Screening',expectedRevision:0,reason:'Synthetic decision'});assert.equal(r.status,200);assert.equal(r.data.handoffContext,undefined);assert.equal((await Candidate.findById(candidate._id)).status,'new');
 });
 await t.test('stale score is not recomputed or published as trusted',async()=>{await Job.updateOne({_id:job._id},{$set:{requiredSkills:['HACCP']}});const r=await read('own');assert.equal(r.data.handoffContext.scoreStatus,'stale');assert.equal(r.data.handoffContext.score,null);assert.equal(r.data.handoffContext.matching,null);await Job.updateOne({_id:job._id},{$set:{requiredSkills:['Cash handling']}});});
 await t.test('fallback stays within +8 DB reads, normal access has no context-read overhead',async()=>{
  async function count(actor){let ops=[];h.mongoose.set('debug',(c,m)=>ops.push(c+'.'+m));try{const r=await read(actor);assert.equal(r.status,200);return ops.length;}finally{h.mongoose.set('debug',false);}}
  const fallback=await count('own');await Application.updateOne({_id:app._id},{$set:{departmentId:'other'}});const ordinary=await count('own');await Application.updateOne({_id:app._id},{$set:{departmentId:'dep_hr'}});assert.ok(fallback-ordinary<=8);assert.ok(fallback-ordinary>0);console.log(JSON.stringify({scenario:'DB budget',ordinary,fallback,additional:fallback-ordinary}));
 });
 await t.test('mixed existing grants remain independent; fully readable parents need no context reads',async()=>{
  await Candidate.updateOne({_id:candidate._id},{$set:{assignedTo:h.actors.own._id}});const mixed=await read('own');assert.equal(mixed.data.candidateId.name,candidate.name);assert.equal(mixed.data.jobId,null);assert.equal(mixed.data.handoffContext.job.title,job.title);
  await Job.updateOne({_id:job._id},{$set:{assignedTo:h.actors.own._id}});let reads=0,contextParentReads=0;h.mongoose.set('debug',(c,m)=>{reads++;if(['candidates','jobs'].includes(c)&&m==='findOne')contextParentReads++;});let full;try{full=await read('own');}finally{h.mongoose.set('debug',false);}assert.equal(full.status,200);assert.equal(full.data.handoffContext,undefined);assert.equal(contextParentReads,0);console.log(JSON.stringify({scenario:'existing full parent grants',reads,contextParentReads}));
  await Candidate.updateOne({_id:candidate._id},{$set:{assignedTo:h.actors.admin._id}});await Job.updateOne({_id:job._id},{$set:{assignedTo:h.actors.admin._id}});
 });
 await t.test('deleted or malformed parents expose no partial context and archives retain read-only history policy',async()=>{
  const before=await Candidate.collection.findOne({_id:candidate._id});await Candidate.collection.deleteOne({_id:candidate._id});try{const r=await read('own');assert.equal(r.status,200);assert.equal(r.data.handoffContext,undefined);}finally{await Candidate.collection.insertOne(before);}
  await Candidate.collection.updateOne({_id:candidate._id},{$set:{skills:[]}});await Candidate.collection.updateOne({_id:candidate._id},{$set:{name:'x'.repeat(501)}});try{assert.equal((await read('own')).data.handoffContext,undefined);}finally{await Candidate.collection.replaceOne({_id:candidate._id},before);}
  await Candidate.updateOne({_id:candidate._id},{$set:{archivedAt:new Date()}});assert.ok((await read('own')).data.handoffContext);await Candidate.updateOne({_id:candidate._id},{$unset:{archivedAt:1}});
 });
 await t.test('expired and revoked sessions cannot receive context',async()=>{
  const jwt=require('jsonwebtoken'),Revoked=require('../models/revokedToken.model'),token=h.tokens.own;
  try{h.tokens.own=jwt.sign({id:String(h.actors.own._id),exp:Math.floor(Date.now()/1000)-1},process.env.JWT_SECRET);assert.equal((await read('own')).status,401);}finally{h.tokens.own=token;}
  const tokenHash=crypto.createHash('sha256').update(token).digest('hex');await Revoked.create({tokenHash,userId:h.actors.own._id,expiresAt:new Date(Date.now()+60000)});try{const r=await read('own');assert.equal(r.status,401);assert.equal(r.data.handoffContext,undefined);}finally{await Revoked.deleteOne({tokenHash});}
 });
 for(const scenario of ['reassignment','revision','parent-department','role','scope','user-department','inactive','session-invalidated'])await t.test('in-flight '+scenario+' fails closed before context delivery',async()=>{
  const original=Candidate.findOne;const role=await h.models.Role.findOne({key:'recruitment_employee'}).lean();let changed=false;
  Candidate.findOne=function(...args){const q=original.apply(this,args),exec=q.exec;q.exec=async function(...a){const row=await exec.apply(this,a);if(!changed&&row?.name===candidate.name){changed=true;
    if(scenario==='reassignment')await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.peer._id},$inc:{__v:1}});
    if(scenario==='revision')await Application.updateOne({_id:app._id},{$inc:{__v:1}});
    if(scenario==='parent-department')await Candidate.updateOne({_id:candidate._id},{$set:{departmentId:'other'}});
    if(scenario==='role')await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'test_none'}});
    if(scenario==='scope')await h.models.Role.updateOne({key:'recruitment_employee'},{$set:{permissions:[]}});
    if(scenario==='user-department')await h.models.User.updateOne({_id:h.actors.own._id},{$set:{departmentId:'other'}});
    if(scenario==='inactive')await h.models.User.updateOne({_id:h.actors.own._id},{$set:{isActive:false}});
    if(scenario==='session-invalidated')process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
   }return row;};return q;};
  const secret=process.env.JWT_SECRET;try{const r=await read('own');assert.equal(changed,true);assert.ok([401,403,404,409].includes(r.status));assert.equal(r.data.handoffContext,undefined);assert.ok(!JSON.stringify(r.data).includes(candidate.email));}finally{Candidate.findOne=original;process.env.JWT_SECRET=secret;await Application.updateOne({_id:app._id},{$set:{assignedTo:h.actors.own._id,departmentId:'dep_hr'}});await Candidate.updateOne({_id:candidate._id},{$set:{departmentId:'dep_hr'}});await h.models.User.updateOne({_id:h.actors.own._id},{$set:{role:'recruitment_employee',isActive:true,departmentId:'dep_hr'}});await h.models.Role.updateOne({key:'recruitment_employee'},{$set:{permissions:role.permissions}});}
 });
},{canonicalHR:true}));
