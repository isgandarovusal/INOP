const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
const {calculateApplicationMatch}=require('../services/applicationMatch.service');
test('Full-vacancy ranking is current, bounded, independently scoped and cursor-safe',async t=>withAuditFixture(async h=>{
 const p={createdBy:h.actors.own._id,departmentId:'dep_A',assignedTo:h.actors.assigned._id};
 for(const scope of ['own','department','assigned','none'])await h.models.Role.updateOne({key:'test_'+scope},{$push:{permissions:['application','candidate','recruitment'].map(resource=>({resource,action:'*',scope}))}});
 const job=await Job.create({title:'Cashier',description:'Private job text',department:'HR',requiredSkills:['HACCP','Food safety'],...p});
 const foreignJob=await Job.create({title:'Foreign vacancy',department:'HR',description:'Private',createdBy:h.actors.foreign._id,assignedTo:h.actors.foreign._id,departmentId:'dep_B'});
 const all=[];
 for(let i=0;i<42;i++){
  const candidate=await Candidate.create({name:'Applicant '+String(i).padStart(2,'0'),role:'Cashier',skills:i===0?['HACCP','Food safety']:i===1?['HACCP']:[],reviewedFields:['skills'],email:'PRIVATE_EMAIL@example.invalid',cvReview:{fields:{raw:'PRIVATE_EVIDENCE'}},...p});
  const context={jobId:job._id,candidateId:candidate._id},matching=calculateApplicationMatch(job,candidate,{application:context});
  const app=await Application.create({...context,...p,matching,score:matching.score,scoreStatus:matching.scoreStatus,notes:'PRIVATE_NOTES',events:[{raw:'PRIVATE_EVENT'}],createdAt:new Date(Date.UTC(2026,0,i+1))});all.push({candidate,app});
 }
 const get=(actor='admin',suffix='',id=job._id)=>h.request(actor,'GET',`/hr/v2/application-ranking?jobId=${id}${suffix}`);
 await t.test('older best score is first even when outside the newest page, and true zero outranks unknown',async()=>{
  const r=await get('admin','&pageSize=3');assert.equal(r.status,200);assert.equal(r.data.total,42);assert.equal(r.data.items.length,3);assert.equal(r.data.items[0]._id,String(all[0].app._id));assert.equal(r.data.items[0].score,100);assert.equal(r.data.items[1].score,50);assert.equal(r.data.items[2].score,0);assert.equal(r.data.items[0].matching.summary,true);assert.equal(r.data.version,'hr-page-v1');
  for(const text of ['PRIVATE_EMAIL','PRIVATE_EVIDENCE','PRIVATE_NOTES','PRIVATE_EVENT','Private job text'])assert.ok(!JSON.stringify(r.data).includes(text));
 });
 for(const actor of ['admin','hr','own','department','assigned'])await t.test(actor+' legal scoped ranking',async()=>{const r=await get(actor,'&pageSize=2');assert.equal(r.status,200);assert.equal(r.data.total,42);assert.equal(r.data.items[0].score,100);});
 await t.test('cursor traversal is stable with no missing or duplicate members and bounded pages',async()=>{
  const seen=new Set();let after='',page=1;
  do{const r=await get('own','&pageSize=7'+after);assert.equal(r.status,200);assert.equal(r.data.page,page++);assert.ok(r.data.items.length<=7);for(const row of r.data.items){assert.ok(!seen.has(row._id));seen.add(row._id);}after=r.data.nextCursor?'&after='+r.data.nextCursor:'';assert.equal(r.data.hasMore,!!after);}while(after);assert.equal(seen.size,42);
 });
 await t.test('forged, changed-filter, different-user and malformed cursors fail closed',async()=>{
  const first=await get('admin','&pageSize=2'),cursor=first.data.nextCursor;assert.equal(first.status,200);
  for(const [actor,suffix] of [['own','&pageSize=2&after='+cursor],['admin','&pageSize=3&after='+cursor],['admin','&pageSize=2&after='+cursor.slice(0,-4)+'AAAA'],['admin','&after=invalid']])assert.equal((await get(actor,suffix)).status,400);
  for(const suffix of ['&pageSize=101','&pageSize=1.5','&page=3','&sort=score','&q=Applicant','&after[]=one'])assert.equal((await get('admin',suffix)).status,400);
 });
 await t.test('candidate edits suppress stale scores and invalidate a previous cohort cursor',async()=>{
  const first=await get('admin','&pageSize=2');await Candidate.updateOne({_id:all[0].candidate._id},{$set:{skills:[]}});
  const next=await get('admin','&pageSize=2&after='+first.data.nextCursor);assert.equal(next.status,409);assert.equal(next.data.code,'RANKING_CHANGED');assert.equal(next.data.items,undefined);
  const fresh=await get();assert.equal(fresh.data.items[0]._id,String(all[1].app._id));assert.equal(fresh.data.items[0].score,50);
  let after='',found;
  do{const r=await get('admin','&pageSize=30'+after);found ||=r.data.items.find(row=>row._id===String(all[0].app._id));after=r.data.nextCursor?'&after='+r.data.nextCursor:'';}while(after);
  assert.equal(found.score,null);assert.equal(found.scoreStatus,'stale');await Candidate.updateOne({_id:all[0].candidate._id},{$set:{skills:['HACCP','Food safety']}});
 });
 await t.test('live grant revocation during a scan prevents any final rows',async()=>{
  const find=Candidate.find;let release,entered,first=true;const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
  Candidate.find=function(...args){const query=find.apply(this,args),exec=query.exec;query.exec=async function(...args){const rows=await exec.apply(this,args);if(first){first=false;entered();await gate;}return rows;};return query;};
  const role=await h.models.Role.findOne({key:'test_own'}).lean();
  try{const pending=get('own');await ready;Candidate.find=find;await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:role.permissions.filter(p=>p.resource!=='application')}});release();const r=await pending;assert.equal(r.status,403);assert.equal(r.data.items,undefined);}
  finally{Candidate.find=find;release();await h.models.Role.updateOne({key:'test_own'},{$set:{permissions:role.permissions}});}
 });
 await t.test('job criteria change suppresses outdated percentage cohort',async()=>{
  const first=await get('admin','&pageSize=2');await Job.updateOne({_id:job._id},{$set:{requiredSkills:['Customer service']}});
  const conflict=await get('admin','&pageSize=2&after='+first.data.nextCursor);assert.equal(conflict.status,409);assert.equal(conflict.data.code,'RANKING_CHANGED');
  const r=await get('admin','&pageSize=100');assert.equal(r.status,200);assert.ok(r.data.items.every(a=>a.score===null&&a.scoreStatus==='stale'));
  await Job.updateOne({_id:job._id},{$set:{requiredSkills:['HACCP','Food safety']}});
 });
 await t.test('legacy and incomplete scores cannot be ranked as trustworthy percentages',async()=>{
  await Application.updateOne({_id:all[2].app._id},{$set:{score:100,matching:null,scoreStatus:'legacy'}});
  const r=await get('admin','&pageSize=100');assert.equal(r.status,200);const row=r.data.items.find(a=>a._id===String(all[2].app._id));assert.equal(row.score,null);assert.equal(row.scoreStatus,'legacy');assert.equal(r.data.items.at(-1)._id,String(all[2].app._id));
 });
 await t.test('independent parent denial redacts names and scores while keeping authorized Application count',async()=>{
  await h.models.Role.create({key:'ranking_mixed',name:'Mixed',permissions:[{resource:'application',action:'read',scope:'all'},{resource:'recruitment',action:'read',scope:'all'}]});await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'ranking_mixed'}});
  const r=await get('peer','&pageSize=100');assert.equal(r.status,200);assert.equal(r.data.total,42);assert.ok(r.data.items.every(a=>a.candidateId===null&&a.score===null&&a.scoreStatus==='restricted'));assert.ok(!JSON.stringify(r.data).includes('Applicant'));
  await h.models.Role.updateOne({key:'ranking_mixed'},{$set:{permissions:[{resource:'application',action:'read',scope:'all'},{resource:'candidate',action:'read',scope:'all'}]}});assert.equal((await get('peer')).status,404);
 });
 await t.test('foreign job IDs, no permission and anonymous requests return no cohort data',async()=>{
  for(const actor of ['own','department','assigned'])assert.equal((await get(actor,'',foreignJob._id)).status,404);
  assert.equal((await get('none')).status,403);assert.equal((await get('anonymous')).status,401);assert.equal((await get('admin','',new h.mongoose.Types.ObjectId())).status,404);
 });
 await t.test('mixed primary scope excludes foreign Applications from rows and counts',async()=>{
  const c=await Candidate.create({name:'Foreign Applicant',role:'Cashier',createdBy:h.actors.foreign._id}),app=await Application.create({jobId:job._id,candidateId:c._id,createdBy:h.actors.foreign._id,departmentId:'dep_B',assignedTo:h.actors.foreign._id});
  for(const actor of ['own','department','assigned']){const r=await get(actor,'&pageSize=100');assert.equal(r.status,200);assert.equal(r.data.total,42);assert.ok(!r.data.items.some(a=>a._id===String(app._id)));}
 });
 await t.test('empty legal vacancy is zero applications rather than fabricated scores',async()=>{
  const empty=await Job.create({title:'Empty job',description:'Nothing',department:'HR',...p}),r=await get('own','',empty._id);assert.equal(r.status,200);assert.equal(r.data.total,0);assert.deepEqual(r.data.items,[]);assert.equal(r.data.hasMore,false);assert.equal(r.data.nextCursor,null);
 });
}));
