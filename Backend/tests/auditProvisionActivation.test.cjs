const {test}=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Current HR/Service provisioning rejects a valid historical KFC revision under a current binding without modifying history or creating duplicates',async()=>withAuditFixture(async h=>{
 const Template=require('../models/auditTemplate.model'),Revision=require('../models/auditTemplateRevision.model');
 for(const [kind,version]of [['hr','source-v1'],['service','service-source-v1']]){
  const service=require(`../services/${kind}AuditAssessment.service`),Binding=require(`../models/${kind}AuditSourceBinding.model`);
  const url=`/audit-${kind}/templates/kfc`;const first=await h.request('admin','POST',url,{});assert.equal(first.status,201);assert.equal((await h.request('admin','POST',url,{})).status,201);
  const current=await Binding.findOne().lean(),oldContent=service.contentFor('kfc',version);service.verifiedSource(oldContent);
  const old=await Revision.create({templateId:current.templateId,revision:2,content:oldContent,publishedBy:h.actors.admin._id,publishedAt:new Date()});
  await Template.updateOne({_id:current.templateId},{$set:{publishedRevisionId:old._id}});await Binding.updateOne({_id:current._id},{$set:{revisionId:old._id}});
  const before=JSON.stringify(await Revision.findById(old._id).lean()),counts=[await Template.countDocuments(),await Revision.countDocuments(),await Binding.countDocuments()];
  const denied=await h.request('admin','POST',url,{});assert.equal(denied.status,409);assert.match(denied.data.message,/current source version/);assert.equal(JSON.stringify(await Revision.findById(old._id).lean()),before);assert.deepEqual([await Template.countDocuments(),await Revision.countDocuments(),await Binding.countDocuments()],counts);service.verifiedSource((await Revision.findById(old._id).lean()).content);
 }
}));
