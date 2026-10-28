const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function fixture({gated=false,failRole=false,failProfile=false,active=true}={}){
 const roleGate=deferred(),profileGate=deferred(),starts=[];
 const state={permissions:[{resource:'candidate',action:'read',scope:'assigned'}],profile:{active:true,organizationId:'gfc',direction:'service'}};
 const user={_id:'1'.repeat(24),name:'Synthetic',email:'synthetic@example.invalid',role:'recruitment_employee',departmentId:'dep_hr',isActive:active,createdAt:'2026-01-01',password:'SYNTHETIC_PRIVATE_HASH',credentialVersion:3};
 const deps={bcryptjs:{compare:async()=>true},jsonwebtoken:{sign:()=> 'synthetic-token'},crypto:require('node:crypto'),
  '../models/user.model':{findById:async()=>user,findOne:()=>({select:async()=>user})},'../models/revokedToken.model':{},
  '../models/role.model':{findOne:q=>{assert.deepEqual(JSON.parse(JSON.stringify(q)),{key:user.role,isActive:true});return{select:()=>({lean:async()=>{starts.push('role');if(gated)await roleGate.promise;if(failRole)throw Error('PRIVATE_ROLE_FAILURE');return{permissions:state.permissions};}})};}},
  '../models/auditorProfile.model':{findById:id=>{assert.equal(id,user._id);return{select:()=>({lean:async()=>{starts.push('profile');if(gated)await profileGate.promise;if(failProfile)throw Error('PRIVATE_PROFILE_FAILURE');return state.profile;}})};}},
  '../services/auditDirection.service':require('../services/auditDirection.service'),
  '../services/hrDepartmentAccess.service':require('../services/hrDepartmentAccess.service'),
  '../services/safeErrorLog.service':{logFailure:()=>{}},
 };
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../controllers/auth.controller.js'),'utf8'),{module,exports:module.exports,require:id=>{assert.ok(id in deps,id);return deps[id];},process:{env:{JWT_SECRET:'synthetic-test-only'}},console});
 const response=()=>({code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
 const request={user:{id:user._id},body:{email:user.email,password:'synthetic-test-only'}};
 return{controller:module.exports,response,request,state,starts,roleGate,profileGate,user};
}
for(const method of ['me','login'])test(method+' reads fresh permissions/profile concurrently and waits for both without changing public fields',async()=>{
 const h=fixture({gated:true}),res=h.response(),pending=h.controller[method](h.request,res);
 await new Promise(setImmediate);const beforeRelease=[...h.starts];assert.equal(res.body,undefined);
 h.roleGate.resolve();await new Promise(setImmediate);assert.equal(res.body,undefined,'A completed role read must not return a partial public profile');h.profileGate.resolve();await pending;
 assert.deepEqual(beforeRelease,['role','profile']);assert.equal(res.code,200);
 const body=JSON.parse(JSON.stringify(res.body.user));assert.deepEqual(body.permissions,h.state.permissions);assert.deepEqual(body.auditDirections,['service']);assert.equal(body.auditDirection,'service');assert.equal(body.hrAccess,true);assert.equal(body.id,h.user._id);assert.equal(body.isActive,true);assert.equal(body.createdAt,h.user.createdAt);
 for(const field of ['password','credentialVersion','managerId'])assert.equal(body[field],undefined);
 if(method==='login')assert.equal(res.body.token,'synthetic-token');
});
for(const method of ['me','login'])for(const failure of ['failRole','failProfile'])test(method+' '+failure+' remains fail-closed without private error or partial user',async()=>{
 const h=fixture({[failure]:true}),res=h.response();await h.controller[method](h.request,res);assert.equal(res.code,500);assert.equal(res.body.user,undefined);assert.equal(res.body.token,undefined);assert.ok(!JSON.stringify(res.body).includes('PRIVATE_'));
});
test('every session response reloads current permissions/directions; inactive user stops before both reads',async()=>{
 const h=fixture(),first=h.response();await h.controller.me(h.request,first);assert.equal(first.body.user.permissions.length,1);
 h.state.permissions=[];h.state.profile={active:false,organizationId:'gfc',direction:'service'};
 const second=h.response();await h.controller.me(h.request,second);assert.equal(second.code,200);assert.equal(second.body.user.permissions.length,0);assert.equal(second.body.user.auditDirection,null);assert.equal(second.body.user.auditDirections.length,0);assert.deepEqual(h.starts,['role','profile','role','profile']);
 const inactive=fixture({active:false}),res=inactive.response();await inactive.controller.me(inactive.request,res);assert.equal(res.code,401);assert.deepEqual(inactive.starts,[]);
});
