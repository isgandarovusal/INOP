const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');const{withAuditFixture}=require('./helpers/auditFixture.cjs');
test('CAPA creation survives lost acknowledgement and concurrent replay without duplicate actions/history',async()=>withAuditFixture(async h=>{
 const audit=await h.audit('own'),Action=require('../models/auditAction.model');
 const body={auditId:String(audit._id),title:'Synthetic reliable corrective action',responsible:String(h.actors.admin._id),description:'Synthetic recovery',dueDate:'2027-01-02',commandId:crypto.randomUUID()};
 const first=await h.request('admin','POST','/audit-actions',body);assert.equal(first.status,201);
 const replay=await h.request('admin','POST','/audit-actions',body);assert.equal(replay.status,200);assert.equal(replay.data.data._id,first.data.data._id);
 assert.equal(await Action.countDocuments({auditId:audit._id}),1);assert.equal(await h.models.Activity.countDocuments({auditId:audit._id,action:'action-created'}),1);
 assert.equal((await h.request('admin','POST','/audit-actions',{...body,title:'Changed command body'})).status,409);
 const second={...body,commandId:crypto.randomUUID(),title:'Synthetic concurrent action'};const both=await Promise.all([h.request('admin','POST','/audit-actions',second),h.request('admin','POST','/audit-actions',second)]);assert.deepEqual(both.map(r=>r.status).sort(),[200,201]);assert.equal(await Action.countDocuments({auditId:audit._id}),2);
 assert.ok(!('commandHash' in first.data.data));assert.ok(!('commandId' in replay.data.data));
}));
