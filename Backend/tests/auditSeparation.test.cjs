const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Four directions enforce restaurant, brand, catalog, parent and child isolation even with all grants',{timeout:120000},async()=>withAuditFixture(async h=>{
 const Profile=require('../models/auditorProfile.model'),Restaurant=require('../models/restaurant.model'),Template=require('../models/auditTemplate.model'),Revision=require('../models/auditTemplateRevision.model');
 for(const [id,brand]of[['allowed-kfc','kfc'],['other-kfc','kfc'],['other-ph','pizza-hut'],['other-ss','simit-sarayi']])await Restaurant.create({id,name:`Synthetic ${id}`,organizationId:'gfc',brandId:brand});
 const actor=h.actors.auditor;
 for(const direction of ['hr','service','standard','occupational-safety']){
  await h.models.Assignment.updateMany({auditor:actor._id},{$set:{status:'revoked'}});
  await Profile.updateOne({_id:actor._id},{$set:{direction}});
  const parents=[];
  for(const restaurantId of ['allowed-kfc','other-kfc','other-ph','other-ss'])parents.push(await h.audit('admin',direction,{restaurantId,status:'in-progress'}));
  await h.assign('auditor',parents[0]);
  const otherDirection=await h.audit('admin',direction==='hr'?'service':'hr',{restaurantId:'allowed-kfc'});await h.assign('auditor',otherDirection); // wrong-direction assignment is never an authority
  const list=await h.request('auditor','GET',`/audits?direction=${direction}`);assert.equal(list.status,200,JSON.stringify(list.data));assert.deepEqual(list.data.map(a=>a.id),[parents[0].id]);
  const catalog=await h.request('auditor','GET','/audit-catalog');assert.equal(catalog.status,200);assert.deepEqual(catalog.data.data.brands.map(b=>b.id),['kfc']);
  const restaurants=await h.request('auditor','GET','/restaurants');assert.equal(restaurants.status,200);assert.deepEqual(restaurants.data.map(r=>r.id),['allowed-kfc']);
  for(const p of [...parents.slice(1),otherDirection]){
   assert.ok([403,404].includes((await h.request('auditor','GET',`/audits/${p.id}`)).status));
   for(const path of [`/audit-report/${p._id}`,`/audit-export/${p._id}/excel`,`/audit-findings/${p._id}`,`/audit-evidence/by-audit/${p._id}`])assert.ok([403,404].includes((await h.request('auditor','GET',path)).status),path);
   assert.ok([403,404].includes((await h.request('auditor','PATCH',`/audit-workflow/${p._id}/status`,{status:'completed'})).status));
   assert.ok([403,404].includes((await h.request('auditor','POST','/audit-execution',{auditId:String(p._id)})).status));
   assert.ok([403,404].includes((await h.request('auditor','POST','/audit-approval',{auditId:String(p._id),reviewer:String(h.actors.admin._id)})).status));
   assert.ok([403,404].includes((await h.request('auditor','POST','/audit-closure',{auditId:String(p._id)})).status));
  }
  for(const restaurantId of ['other-kfc','other-ph','other-ss'])assert.equal((await h.request('auditor','POST','/audits',{id:crypto.randomUUID(),auditType:direction,restaurantId,date:'2026-10-16'})).status,403);
  for(const brandId of ['kfc','pizza-hut','simit-sarayi']){
   const template=await Template.create({organizationId:'gfc',brandId,brandName:brandId,auditType:direction,name:`Synthetic ${direction}/${brandId}`,status:'draft'});
   if(brandId!=='kfc')assert.equal((await h.request('auditor','GET',`/audit-templates/${template._id}`)).status,403);
  }
  const templates=await h.request('auditor','GET',`/audit-templates?auditType=${direction}`);assert.equal(templates.status,200);assert.ok(templates.data.every(t=>t.brandId==='kfc'&&t.auditType===direction));
  for(const prefix of ['hr','service','standard']){const res=await h.request('auditor','GET',`/audit-${prefix}/sources`);if(prefix===direction){assert.equal(res.status,200,JSON.stringify(res.data));assert.deepEqual(res.data.data.map(s=>s.brandId),['kfc']);}else assert.equal(res.status,403);}
  const allAdmin=await h.request('admin','GET',`/audits?direction=${direction}`);assert.equal(allAdmin.status,200);assert.ok(parents.every(p=>allAdmin.data.some(a=>a.id===p.id)));
  const noneRevision=await h.request('auditor','POST','/audits',{id:crypto.randomUUID(),auditType:direction,restaurantId:'allowed-kfc',date:'2026-10-16'});assert.equal(noneRevision.status,direction==='standard'?409:201,JSON.stringify(noneRevision.data));
  await h.models.Assignment.updateMany({auditId:parents[0]._id,auditor:actor._id},{$set:{status:'revoked'}});assert.ok([403,404].includes((await h.request('auditor','GET',`/audits/${parents[0].id}`)).status));
 }
 // A role promotion leaves an existing direction profile in force.
 await Profile.updateOne({_id:actor._id},{$set:{direction:'standard'}});await h.models.User.updateOne({_id:actor._id},{$set:{role:'admin'}});h.tokens.auditor=require('jsonwebtoken').sign({id:String(actor._id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'1h'});
 const promoted=await h.request('auditor','GET','/audits?direction=hr');assert.equal(promoted.status,200);assert.deepEqual(promoted.data,[]);
 assert.equal((await h.request('auditor','GET','/audit-hr/sources')).status,403);
 assert.equal((await h.request('auditor','POST','/audit-standard/templates/pizza-hut',{})).status,403);
 const tenantAudit=await h.audit('admin','standard',{restaurantId:'allowed-kfc'});await require('../models/auditContext.model').collection.insertOne({_id:tenantAudit._id,organizationId:'foreign-tenant',brandId:'kfc',direction:'standard',restaurantId:'allowed-kfc'});await h.assign('auditor',tenantAudit);
 assert.ok([403,404].includes((await h.request('auditor','GET',`/audits/${tenantAudit.id}`)).status));assert.ok(!(await h.request('admin','GET','/audits')).data.some(a=>a.id===tenantAudit.id));
 await Restaurant.collection.insertOne({id:'foreign-tenant-restaurant',name:'Synthetic foreign tenant',organizationId:'foreign-tenant',brandId:'kfc'});
 const outsideTenant=await h.audit('admin','standard',{restaurantId:'foreign-tenant-restaurant'});await h.assign('auditor',outsideTenant);
 assert.ok([403,404].includes((await h.request('admin','GET',`/audits/${outsideTenant.id}`)).status));assert.equal((await h.request('admin','GET','/restaurants/foreign-tenant-restaurant')).status,404);assert.ok(!(await h.request('admin','GET','/restaurants')).data.some(r=>r.id==='foreign-tenant-restaurant'));
 assert.equal(await Revision.countDocuments(),0,'No test catalogue publication was required for isolation checks');
}));
