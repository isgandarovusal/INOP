const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),{docx,pdf}=require('./helpers/cvDocuments.cjs');
const Source=require('../models/hrCvIntake.model'),Sync=require('../models/hrGraphSync.model'),Receipt=require('../models/hrGraphReceipt.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
const {createIntake}=require('../services/hrCvIntake.service'),{createSync}=require('../services/hrGraphSync.service'),{identity,commandId}=require('../services/hrGraphAdapter.service');
const storage=require('../services/hrPrivateObjectStorage.service');
test('GFC recruitment E2E uses real scoped HTTP/Mongo/extraction/HR/ATS/workflows with synthetic Graph, private store and AV only',async t=>withAuditFixture(async h=>{
 for(const model of [Source,Sync,Receipt,Application])await model.createIndexes();
 for(const scope of ['own','department','assigned'])await h.models.Role.updateOne({key:'test_'+scope},{$push:{permissions:['candidate','application','recruitment'].map(resource=>({resource,action:'*',scope}))}});
 const jobs=[],apps=[],objects=new Map();let puts=0;
 const store={get:async ref=>{if(!objects.has(ref.key))throw Object.assign(Error('Synthetic missing'),{code:'STORAGE_NOT_FOUND'});return Buffer.from(objects.get(ref.key));},put:async(ref,b)=>{puts++;objects.set(ref.key,Buffer.from(b));}};
 const queue=createIntake({enabled:true,evidenceMode:'test',store,scanner:{scan:async(_,c)=>({verdict:'clean',sha256:c.sha256,engine:'synthetic-only',version:'1'})}}),req={headers:{authorization:'Bearer '+h.tokens.admin}};
 const tenant='11111111-1111-4111-8111-111111111111',mailbox='33333333-3333-4333-8333-333333333333';
 const files=[{name:'az.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:docx('Ad: Sintetik Namizəd\nTelefon: +994 (50) 123-45-67\nBacarıqlar\nQida təhlükəsizliyi\nHACCP')},{name:'en.pdf',mime:'application/pdf',bytes:await pdf('Name: Synthetic Applicant\nPhone: +994 50 123 45 67\nSkills\nFood safety\nHACCP')},{name:'ru.docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:docx('Имя: Синтетический Кандидат\nТелефон: +994-50-123-45-67\nНавыки\nПищевая безопасность\nHACCP')}];
 await t.test('three brands/multiple branches and legacy-unbranded office link remain explicit',async()=>{
  for(const [i,brandId]of ['kfc','pizza-hut','simit-sarayi'].entries()){
   const branch=await h.request('admin','POST','/hr/branches',{code:'e2e-'+brandId,name:'Synthetic '+brandId,brandId,kind:'restaurant'});assert.equal(branch.status,201);
   const job=await h.request('admin','POST','/jobs',{title:'Cashier',description:'Food service',department:'HR',brandId,branchId:branch.data._id,requiredSkills:['Food safety'],preferredSkills:['HACCP']});assert.equal(job.status,201);jobs.push(job.data);
  }
  const office=await h.request('admin','POST','/hr/branches',{code:'e2e-office',name:'GFC Office',kind:'office'});assert.equal(office.status,201);assert.equal(office.data.brandId,null);
 });
 const adapter={delta:async()=>({items:files.map((_,i)=>({id:'immutable-'+i,subject:'GFC_'+i,recipients:['hr@example.invalid'],receivedAt:new Date().toISOString(),hasAttachments:true})),deltaLink:'synthetic-private-cursor',evidenceMode:'test'}),listAttachments:async(_,message)=>({items:[{id:'attachment',type:'#microsoft.graph.fileAttachment',name:files[Number(message.at(-1))].name,mimeType:files[Number(message.at(-1))].mime,size:files[Number(message.at(-1))].bytes.length,isInline:false}]}),attachment:async(m,message,a)=>{const file=files[Number(message.at(-1))],hash=identity(tenant,m,message,a);return{file:{buffer:file.bytes,originalname:file.name,mimetype:file.mime},source:{key:'outlook',identityHash:hash},commandId:commandId(hash),evidenceMode:'test'};}};
 const sync=createSync({enabled:true,adapter,intake:queue,tenantId:tenant,actorId:String(h.actors.admin._id),mailboxIds:[mailbox],mappings:jobs.map((j,i)=>({reference:'GFC_'+i,jobId:j._id})),evidenceMode:'test'});
 await t.test('immutable mailbox source -> private originals -> real PDF/DOCX extraction without automatic person/decision',async()=>{
  assert.equal((await sync.sync(req,mailbox)).processed,3);assert.equal(puts,3);assert.equal(await Candidate.countDocuments(),0);await queue.runOnce(3);
  for(const [i,file]of files.entries()){
   const row=await Source.findOne({'original.originalName':file.name}),source=await queue.get(req,row._id);assert.equal(source.state,'ready');assert.equal(source.result.parsed.phone,'+994501234567');assert.equal(source.result.review.reviewStatus,'pending');assert.deepEqual((await queue.original(req,row._id)).bytes,file.bytes);
   const input={confirmed:true,expectedHash:source.original.sha256,expectedUpdatedAt:new Date(source.updatedAt).toISOString(),profile:{name:'Reviewed '+i,role:'Cashier',email:'synthetic-'+i+'@example.invalid',phone:source.result.parsed.phone,skills:i===1?[]:['Food safety','HACCP'],experience:null},jobId:jobs[i]._id};
   await assert.rejects(queue.approve(req,row._id,{...input,confirmed:false}),{status:400});const approved=await queue.approve(req,row._id,input),app=await h.request('admin','GET','/applications/'+approved.applicationId);assert.equal(app.status,200);assert.equal(app.data.score,i===1?0:100);assert.equal(app.data.matching.version,'ats-v2');assert.equal(app.data.status,'Applied');assert.equal(app.data.source.key,'outlook');apps.push(app.data);
  }
  await sync.sync(req,mailbox);assert.equal(puts,3);assert.equal(await Candidate.countDocuments(),3);
 });
 await t.test('authenticated exact original downloads require current Candidate parent and never expose private source references',async()=>{
  assert.equal(apps.length,3);const factory=storage.fromEnvironment;storage.fromEnvironment=()=>store;
  try{for(const [i,app]of apps.entries()){const id=app.candidateId._id,download=await h.request('admin','GET','/candidates/'+id+'/cv');assert.equal(download.status,200);assert.deepEqual(download.buffer,files[i].bytes);assert.equal((await h.request('anonymous','GET','/candidates/'+id+'/cv')).status,401);assert.equal((await h.request('own','GET','/candidates/'+id+'/cv')).status,404);assert.ok(!JSON.stringify(app).includes('privateCv'));}}finally{storage.fromEnvironment=factory;}
 });
 await t.test('same Candidate across Jobs retains independent Application stages and current matching',async()=>{
  const second=await h.request('admin','POST','/applications',{jobId:jobs[1]._id,candidateId:apps[0].candidateId._id});assert.equal(second.status,201);assert.equal(second.data.status,'Applied');assert.equal(second.data.score,100);
  const moved=await h.request('admin','PATCH','/applications/'+apps[0]._id+'/status',{status:'Screening',expectedRevision:apps[0].__v,reason:'Explicit HR screening'});assert.equal(moved.status,200);apps[0]=moved.data;assert.equal((await Application.findById(second.data._id)).status,'Applied');
 });
 await t.test('board/current revision, real-zero, interview timezone, explicit decisions and durable delivery history',async()=>{
  let app=apps[0];const race=await Promise.all(['Shortlisted','Interview'].map(status=>h.request('admin','PATCH','/applications/'+app._id+'/status',{status,expectedRevision:app.__v,reason:'HR selection'})));assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);app=race.find(r=>r.status===200).data;
  if(app.status!=='Interview')app=(await h.request('admin','PATCH','/applications/'+app._id+'/status',{status:'Interview',expectedRevision:app.__v})).data;
  const scheduled=await h.request('admin','PATCH','/applications/'+app._id+'/workflow',{expectedRevision:app.__v,interview:{localStart:'2026-11-10T10:30',timezone:'Asia/Baku',durationMinutes:30,interviewerId:String(h.actors.admin._id),result:'pending'},substatus:'scheduled',reason:'HR scheduled'});assert.equal(scheduled.status,200);app=scheduled.data;assert.equal(app.interview.startsAt,'2026-11-10T06:30:00.000Z');
  const beforeDelivery=await Application.findById(app._id).lean();let sends=0;await require('../services/applicationNotificationWorker.service').createNotificationWorker({available:()=>true,send:async()=>{sends++;throw Error('RAW_PRIVATE_SMTP_DIAGNOSTIC');}}).runOnce(5);const afterDelivery=await Application.findById(app._id).lean();assert.equal(sends,1);assert.equal(afterDelivery.status,'Interview');assert.equal(afterDelivery.__v,beforeDelivery.__v);assert.ok(afterDelivery.events.some(e=>e.delivery?.code==='DELIVERY_FAILED'));assert.ok(!JSON.stringify(afterDelivery.events).includes('RAW_PRIVATE'));
  for(const status of ['Offered','Hired']){const r=await h.request('admin','PATCH','/applications/'+app._id+'/status',{status,expectedRevision:app.__v,reason:'Explicit HR decision'});assert.equal(r.status,200);app=r.data;}
  const history=await h.request('admin','GET','/applications/'+app._id+'/history');assert.ok(history.data.items.every(e=>e.actor===String(h.actors.admin._id)));assert.ok(history.data.items.some(e=>e.type==='status'&&e.after.status==='Hired'));
  const board=await h.request('admin','GET','/hr/v2/application-board?jobId='+jobs[0]._id);assert.equal(board.status,200);assert.equal(board.data.columns.Hired.total,1);assert.equal(board.data.total,1);
 });
 await t.test('scoped three-brand/branch analytics agree with Application dataset and redact all contacts/CV facts',async()=>{
  const r=await h.request('admin','GET','/hr/analytics');assert.equal(r.status,200);assert.equal(r.data.totals.applications,4);assert.equal(r.data.scores.buckets[0].count,1);assert.deepEqual(r.data.byBrand.map(v=>v.id).sort(),['kfc','pizza-hut','simit-sarayi']);
  for(const [i,job]of jobs.entries()){const stats=await h.request('admin','GET','/hr/analytics?brandId='+job.brandId+'&branchId='+job.branchId);assert.equal(stats.data.totals.applications,i===1?2:1);}
  const body=JSON.stringify(r.data);for(const secret of ['Reviewed','+994','privateCv','identityHash','Food safety'])assert.ok(!body.includes(secret));
  for(const actor of ['own','department','assigned'])assert.equal((await h.request(actor,'GET','/hr/analytics')).data.totals.applications,actor==='department'?4:0);
  assert.equal((await h.request('anonymous','GET','/hr/analytics')).status,401);
 });
 await t.test('duplicate original is review-only, never automatic merge/new person',async()=>{const item=await queue.enqueue(req,{buffer:files[0].bytes,originalname:files[0].name,mimetype:files[0].mime},crypto.randomUUID());await queue.runOnce(1);const duplicate=await queue.duplicates(req,item.id);assert.equal(duplicate.automaticMerge,false);assert.ok(duplicate.items.some(v=>v.reasons.includes('same_original')));assert.equal(await Candidate.countDocuments(),3);});
}));
