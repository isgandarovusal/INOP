const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs'),Job=require('../models/job.model');
test('Vacancy requirements reject coerced nontext/nonnumeric input without altering matching data',async t=>withAuditFixture(async h=>{
 const valid={title:'Synthetic vacancy',description:'Synthetic description',department:'HR',requiredSkills:['HACCP'],experienceYears:'2'};
 const created=await h.request('admin','POST','/jobs',valid);assert.equal(created.status,201);const id=created.data._id;
 for(const [field,value]of [['title',{}],['description',['not text']],['requiredSkills',[{skill:'HACCP'}]],['preferredSkills',[true]],['requiredEducation',[2]],['requiredCertificates',[['HACCP']]],['experienceYears',true],['experienceYears',[]],['experienceYears',{}]])await t.test(field+' '+JSON.stringify(value),async()=>{
  const before=await Job.findById(id).lean(),count=await Job.countDocuments();
  assert.equal((await h.request('admin','POST','/jobs',{...valid,[field]:value})).status,400);
  assert.equal(await Job.countDocuments(),count);
  assert.equal((await h.request('admin','PUT','/jobs/'+id,{[field]:value})).status,400);
  assert.deepEqual(await Job.findById(id).lean(),before);
 });
 await t.test('legacy CSV and numeric strings remain supported; zero and fractional experience preserved',async()=>{
  const r=await h.request('admin','PUT','/jobs/'+id,{requiredSkills:' HACCP, Food safety ',experienceYears:'0.5'});assert.equal(r.status,200);assert.deepEqual(r.data.requiredSkills,['HACCP','Food safety']);assert.equal(r.data.experienceYears,0.5);
  assert.equal((await h.request('admin','PUT','/jobs/'+id,{experienceYears:0})).data.experienceYears,0);
 });
}));
