const test=require('node:test'),assert=require('node:assert/strict');
const {withAuditFixture}=require('./helpers/auditFixture.cjs');
test('Promoted reviewers retain direction scope; inactive profiles cannot receive approval requests',async()=>withAuditFixture(async h=>{
 const Profile=require('../models/auditorProfile.model');
 await h.models.User.updateOne({_id:h.actors.peer._id},{$set:{role:'audit_manager'}});
 await Profile.create({_id:h.actors.peer._id,organizationId:'gfc',direction:'service',active:true});
 const service=await h.audit('admin','service'),standard=await h.audit('admin','standard');
 const request=audit=>h.request('admin','POST','/audit-approval',{auditId:String(audit._id),reviewer:String(h.actors.peer._id)});
 assert.equal((await request(standard)).status,403);
 assert.equal((await h.request('peer','GET',`/audits/${standard.id}`)).status,404);
 assert.equal((await request(service)).status,201);
 await h.models.Approval.deleteMany({auditId:service._id});
 await Profile.updateOne({_id:h.actors.peer._id},{$set:{active:false}});
 assert.equal((await request(service)).status,403);
 assert.equal(await h.models.Approval.countDocuments({auditId:service._id}),0);
 assert.equal((await h.request('peer','GET','/audits')).status,403);
 const directory=await h.request('admin','GET',`/audit-approval/${service._id}/reviewers`);
 assert.equal(directory.status,200);assert.ok(!directory.data.data.some(person=>person.id===String(h.actors.peer._id)));
 // A known catalog violation in legacy/raw data must also fail closed.
 await Profile.collection.updateOne({_id:h.actors.peer._id},{$set:{active:true,direction:'unknown'}});
 assert.equal((await request(service)).status,403);
 assert.equal((await h.request('peer','GET','/audits')).status,403);
}));
test('Timed-out provider work retains capacity until it actually settles',async()=>{
 const storage=require('../services/auditEvidenceStorage.service');
 const bytes=Buffer.from('synthetic'),auditId='0123456789abcdef01234567',input=storage.prepare(bytes,'text/plain',auditId,'qa-bounded');
 const ref={...input,version:'1'},resolvers=[];
 const adapter={id:'qa-bounded',capabilities:{private:true,durable:true,versioned:true,conditionalWrites:true},
  get:()=>new Promise(resolve=>resolvers.push(resolve)),put:async()=>({private:true,version:'1'}),remove:async()=>{}};
 const store=storage.createPrivateStore(adapter,{timeoutMs:10});
 await Promise.all([assert.rejects(store.get(ref),{code:'AUDIT_STORAGE_TIMEOUT'}),assert.rejects(store.get(ref),{code:'AUDIT_STORAGE_TIMEOUT'})]);
 try{await assert.rejects(store.get(ref),{code:'AUDIT_STORAGE_BUSY'});assert.equal(resolvers.length,2);}
 finally{resolvers.forEach(resolve=>resolve(bytes));await new Promise(resolve=>setImmediate(resolve));}
 adapter.get=async()=>bytes;assert.deepEqual(await store.get(ref),bytes);
});
