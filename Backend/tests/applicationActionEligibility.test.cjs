const test = require('node:test'), assert = require('node:assert/strict');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Application = require('../models/application.model');

test('Application action eligibility uses authoritative mutation scopes without owner disclosure or N+1 reads', async t => withAuditFixture(async h => {
  const role = await h.models.Role.create({key:'action_eligibility_fixture',name:'Synthetic mixed scopes',permissions:[]});
  await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:role.key,departmentId:'dep_hr'}});
  const c=(await h.request('admin','POST','/candidates',{name:'Synthetic eligibility applicant',role:'Cashier'})).data;
  const j=(await h.request('admin','POST','/jobs',{title:'Synthetic eligibility job',department:'HR',description:'Synthetic'})).data;
  const a=(await h.request('admin','POST','/applications',{candidateId:c._id,jobId:j._id})).data;
  const grants=async(scope,action='update')=>h.models.Role.updateOne({_id:role._id},{$set:{permissions:[{resource:'application',action:'read',scope:'all'},...(scope?[{resource:'application',action,scope}]:[])]}});
  const read=async()=>{
    const page=await h.request('peer','GET','/hr/v2/applications');assert.equal(page.status,200);
    return page.data.items.find(r=>r._id===a._id);
  };
  for(const [scope,ownership,allowed] of [
    ['all',{},true],['assigned',{assignedTo:h.actors.peer._id},true],['assigned',{assignedTo:h.actors.admin._id},false],
    ['own',{createdBy:h.actors.peer._id},true],['own',{createdBy:h.actors.admin._id},false],
    ['department',{departmentId:'dep_hr'},true],['department',{departmentId:'dep_other'},false],
    ['none',{},false],[null,{},false],
  ]) await t.test(`${scope}: ${JSON.stringify(ownership)} => ${allowed}`,async()=>{
    await grants(scope);await Application.updateOne({_id:a._id},{$set:{createdBy:h.actors.admin._id,assignedTo:h.actors.admin._id,departmentId:'dep_other',...ownership}});
    const row=await read();
    assert.deepEqual(row.actionEligibility,{version:'application-actions-v1',applicationId:a._id,revision:row.__v||0,update:allowed,delete:false});
    assert.equal(Object.hasOwn(row,'createdBy'),false);assert.equal(Object.hasOwn(row,'departmentId'),false);
    const detail=await h.request('peer','GET','/applications/'+a._id);assert.equal(detail.status,200);assert.deepEqual(detail.data.actionEligibility,row.actionEligibility);
    const board=await h.request('peer','GET','/hr/v2/application-board');assert.equal(board.status,200);
    const card=Object.values(board.data.columns).flatMap(l=>l.items).find(r=>r._id===a._id);assert.deepEqual(card.actionEligibility,row.actionEligibility);
    assert.equal(Object.hasOwn(card,'createdBy'),false);assert.equal(Object.hasOwn(card,'departmentId'),false);
    const mutation=await h.request('peer','PATCH','/applications/'+a._id+'/status',{status:'Screening'});assert.equal(mutation.status,allowed?200:scope===null||scope==='none'?403:404);
  });
  await t.test('delete has its own independent grant; update is not delete',async()=>{
    await grants('assigned','delete');await Application.updateOne({_id:a._id},{$set:{assignedTo:h.actors.peer._id}});
    const row=await read();assert.equal(row.actionEligibility.update,false);assert.equal(row.actionEligibility.delete,true);
    await Application.updateOne({_id:a._id},{$set:{assignedTo:h.actors.admin._id}});assert.equal((await read()).actionEligibility.delete,false);
    assert.equal((await h.request('peer','DELETE','/applications/'+a._id)).status,404);
  });
  await t.test('revoked HR membership and absent/expired session remain denied',async()=>{
    await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{departmentId:'dep_other'}});
    assert.equal((await h.request('peer','GET','/hr/v2/applications')).status,403);
    assert.equal((await h.request('anonymous','GET','/hr/v2/applications')).status,401);
    await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{departmentId:'dep_hr'}});
  });
  await t.test('one versus twelve records use the same bounded database operation count',async()=>{
    await grants('all');let ops=[];h.mongoose.set('debug',(collection,method)=>ops.push(collection+'.'+method));
    try {
      await read();const one=[...ops];
      for(let i=0;i<11;i++)await Application.create({jobId:j._id,candidateId:(await h.request('admin','POST','/candidates',{name:'Synthetic scale '+i,role:'Cashier'})).data._id,departmentId:'dep_hr',assignedTo:h.actors.peer._id});
      ops=[];const page=await h.request('peer','GET','/hr/v2/applications');assert.equal(page.data.items.length,12);
      assert.equal(ops.length,one.length);console.log(JSON.stringify({oneRecordDbReads:one.length,twelveRecordDbReads:ops.length,operations:ops}));
      assert.ok(page.data.items.every(r=>r.actionEligibility.update));
    } finally{h.mongoose.set('debug',false);}
  });
}));

test('eligibility resolver reuses effective grants, ignores supplied flags and fails closed on missing authority',()=>{
 const {actionEligibility}=require('../services/applicationActionEligibility.service');
 const row={_id:'synthetic-app',__v:3,assignedTo:'synthetic-user',createdBy:'other',departmentId:'dep_hr',actionEligibility:{update:true,delete:true}};
 const req={user:{id:'synthetic-user',role:'synthetic',departmentId:'dep_hr'},authRole:{permissions:[{resource:'application',action:'update',scope:'assigned'}]}};
 assert.equal(actionEligibility(req,row).update,true);assert.equal(actionEligibility(req,row).delete,false);
 for(const scope of ['none','unknown','',undefined]){req.authRole.permissions[0].scope=scope;assert.equal(actionEligibility(req,row).update,false);}
 req.authRole.permissions=[{resource:'*',action:'*',scope:'own'}];assert.equal(actionEligibility(req,row).update,false);
 req.authRole.permissions=[{resource:'*',action:'*',scope:'all'}];assert.equal(actionEligibility(req,row).delete,true);
 assert.equal(actionEligibility({...req,authRole:undefined},row).update,false);
 assert.equal(actionEligibility({...req,user:{...req.user,departmentId:'other'}},row).update,false);
 assert.equal(actionEligibility({...req,user:undefined},row).update,false);
});
