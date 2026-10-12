const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const mongoose=require('mongoose');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
const Branch=require('../models/recruitmentBranch.model'),Job=require('../models/job.model'),Candidate=require('../models/candidate.model'),Application=require('../models/application.model');
test('One hundred branches and5000 applications retain canonical scoped pagination, filters and bounded analytics',async t=>withAuditFixture(async h=>{
 assert.equal(mongoose.connection.host,'127.0.0.1');assert.match(mongoose.connection.name,/^inop_audit_test_/);
 for(const actor of['hr','own','department','assigned']){
  await h.models.User.updateOne({_id:h.actors[actor]._id},{departmentId:'dep_hr'});
  await h.models.Role.updateOne({key:h.actors[actor].role},{permissions:['candidate','application','recruitment'].map(resource=>({resource,action:'*',scope:actor==='hr'?'all':actor}))});
 }
 const records=[];
 const request=async(actor,url)=>{const started=performance.now(),original=mongoose.get('debug'),methods={};mongoose.set('debug',(collection,method)=>{const key=collection+':'+method;methods[key]=(methods[key]||0)+1;});try{const r=await h.request(actor,'GET',url,undefined,{timeoutMs:20000});records.push({actor,url,status:r.status,ms:performance.now()-started,bytes:r.buffer.length,observedMongooseMethods:methods});return r;}finally{mongoose.set('debug',original||false);}};
 const jobs=[];
 for(let i=0;i<100;i++){
  const provenance={createdBy:h.actors[i%2?'hr':'own']._id,assignedTo:h.actors[i%2?'hr':'assigned']._id,departmentId:'dep_hr'},brandId=['kfc','pizza-hut','simit-sarayi'][i%3];
  const b=await Branch.create({code:'synthetic-branch-'+i,name:'Synthetic branch '+String(i).padStart(3,'0'),kind:'restaurant',brandId,...provenance});
  jobs.push(await Job.create({title:'Synthetic cashier '+i,department:'HR',description:'Synthetic responsibilities',brandId,branchId:b._id,requiredSkills:['Cash handling'],...provenance}));
 }
 for(let i=0;i<5000;i+=500){
  const people=[],apps=[];
  for(let n=i;n<i+500;n++){
   const job=jobs[n%100],id=new mongoose.Types.ObjectId(),provenance={createdBy:job.createdBy,assignedTo:job.assignedTo,departmentId:'dep_hr'};
   people.push({_id:id,name:'Synthetic applicant '+n,role:'Cashier',skills:['Cash handling'],...provenance});
   apps.push({candidateId:id,jobId:job._id,status:'Applied',notes:'Synthetic private notes '.repeat(40),...provenance});
  }
  await Candidate.insertMany(people);await Application.insertMany(apps);
 }
 for(const model of[Branch,Job,Candidate,Application])await model.createIndexes();
 await t.test('All100 branches are reachable without unbounded catalog payload',async()=>{
  const ids=new Set();for(let page=1;page<=4;page++){const r=await request('hr','/hr/v2/branches?pageSize=30&sort=name&page='+page);assert.equal(r.status,200);assert.equal(r.data.total,100);assert.ok(r.data.items.length<=30);for(const b of r.data.items)ids.add(b._id);}
  assert.equal(ids.size,100);
 });
 for(const[actor,total]of[['admin',5000],['hr',5000],['own',2500],['department',5000],['assigned',2500]])await t.test(actor+' independent scoped parents and bounded DTO',async()=>{
  const r=await request(actor,'/hr/v2/applications?pageSize=30');assert.equal(r.status,200);assert.equal(r.data.total,total);assert.equal(r.data.items.length,30);assert.ok(r.buffer.length<80000);
  assert.ok(r.data.items.every(a=>a.jobId&&a.candidateId&&!('notes'in a)&&!('events'in a)));
 });
 await t.test('Brand/branch filters and analytics use the same readable Job/Application cohort',async()=>{
  const r=await request('hr','/hr/v2/applications?branchId='+jobs[0].branchId);assert.equal(r.status,200);assert.equal(r.data.total,50);
  const a=await request('hr','/hr/analytics?branchId='+jobs[0].branchId);assert.equal(a.status,200);assert.equal(a.data.totals.applications,50);assert.equal(a.data.totals.activeVacancies,1);assert.ok(a.buffer.length<16000);assert.ok(!a.buffer.toString().includes('Synthetic applicant'));
  const byBrand=await request('hr','/hr/v2/jobs?brandId=kfc');assert.equal(byBrand.status,200);assert.equal(byBrand.data.total,34);
 });
 await t.test('Audit department with wildcard grants still receives403, anonymous401',async()=>{
  await h.models.Role.updateOne({key:h.actors.foreign.role},{permissions:[{resource:'*',action:'*',scope:'all'}]});
  assert.equal((await request('foreign','/hr/v2/branches')).status,403);assert.equal((await request('foreign','/hr/v2/applications')).status,403);assert.equal((await request('anonymous','/hr/v2/applications')).status,401);
 });
 await t.test('Page size does not create per-row queries; existing schema indexes give bounded scoped scan',async()=>{const before=records.find(r=>r.actor==='admin'&&r.url==='/hr/v2/applications?pageSize=30');await request('admin','/hr/v2/applications?pageSize=10');const after=records.at(-1);const count=r=>Object.values(r.observedMongooseMethods).reduce((a,b)=>a+b,0);assert.equal(count(before),count(after));assert.ok(count(before)<25);});
 const explain=await Application.find({departmentId:'dep_hr'}).sort({createdAt:-1,_id:-1}).limit(30).explain('executionStats');
 const execution={nReturned:explain.executionStats.nReturned,docsExamined:explain.executionStats.totalDocsExamined,keysExamined:explain.executionStats.totalKeysExamined};assert.equal(execution.nReturned,30);
 fs.writeFileSync('/workspace/inop-hr18-100branches.json',JSON.stringify({hosted:false,branches:100,applications:5000,canonicalHR:true,productionTouched:false,existingSchemaIndexes:Application.schema.indexes().map(([keys])=>keys),execution,records},null,2));
},{canonicalHR:true}));
