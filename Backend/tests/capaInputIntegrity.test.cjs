const test=require('node:test'),assert=require('node:assert/strict');const{withAuditFixture}=require('./helpers/auditFixture.cjs');
test('CAPA rejects unbounded verification text and unknown mutation inputs before changing history',async()=>withAuditFixture(async h=>{
 const audit=await h.audit('own'),Action=require('../models/auditAction.model'),action=await Action.create({auditId:audit._id,title:'Synthetic CAPA',status:'completed',createdBy:String(h.actors.own._id),responsible:String(h.actors.own._id)});
 const url='/audit-actions/'+action._id+'/status';
 assert.equal((await h.request('admin','PUT',url,{status:'rejected',verificationNote:'x'.repeat(4001)})).status,400);
 assert.equal((await h.request('admin','PUT',url,{status:'rejected',verificationNote:{$gt:''}})).status,400);
 assert.equal((await h.request('admin','PUT',url,{status:'rejected',unknown:true})).status,400);
 assert.equal((await Action.findById(action._id)).status,'completed');
 assert.equal((await h.request('admin','PUT',url,{status:'rejected',verificationNote:'Synthetic rework required'})).status,200);
 assert.equal((await h.request('admin','PUT',url,{status:'in-progress'})).status,200);
 assert.equal((await h.request('admin','PUT',url,{status:'completed'})).status,200);
 assert.equal((await h.request('admin','PUT',url,{status:'verified',verificationNote:'Synthetic independent verification'})).status,200);
}));
