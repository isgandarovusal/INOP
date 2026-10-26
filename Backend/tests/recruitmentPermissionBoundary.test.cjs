const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),jwt=require('jsonwebtoken');
const seed=fs.readFileSync(path.join(__dirname,'../scripts/seedRoles.js'),'utf8');
const roles=vm.runInNewContext(seed.slice(seed.indexOf('const permission ='),seed.indexOf('async function seedRoles()'))+'\nroles;');
const permission=require('../middleware/auth.middleware').requirePermission;
const {resourceFilter}=require('../services/hrResourceScope.service');
const response=()=>({code:200,status(n){this.code=n;return this;},json(value){this.body=value;return this;}});
test('Recruitment-only presets enforce server grants and independent parent scope without changing legacy roles',async()=>{
 for(const name of ['recruitment_manager','recruitment_employee']){
  const role=roles.find(r=>r.key===name),req={user:{id:'1'.repeat(24),role:name,departmentId:'dep_hr'},authRole:role,method:'GET'};
  for(const resource of ['candidate','application','recruitment']){let next=false;const res=response();await permission(resource,'read')(req,res,()=>{next=true;});assert.equal(next,true);assert.equal(res.code,200);const scope=resourceFilter(req,resource);assert.equal(name==='recruitment_manager'?scope.departmentId:scope.assignedTo,name==='recruitment_manager'?'dep_hr':req.user.id);}
  for(const resource of ['audit','user','role','department']){let next=false;const res=response();await permission(resource,'read')(req,res,()=>{next=true;});assert.equal(next,false);assert.equal(res.code,403);}
  const foreign={...req,user:{...req.user,departmentId:'dep_audit'}};const res=response();await permission('candidate','read')(foreign,res,()=>assert.fail('Non-HR cannot read CV'));assert.equal(res.code,403);
 }
 const admin={user:{id:'1'.repeat(24),role:'admin'},authRole:roles.find(r=>r.key==='admin'),method:'GET'};let accepted=false;await permission('user','read')(admin,response(),()=>{accepted=true;});assert.equal(accepted,true);
 const legacy=roles.find(r=>r.key==='hr_manager');assert.ok(legacy.permissions.some(p=>p.resource==='user'),'legacy HR role must not be silently narrowed');
 const narrowed={user:{id:'1'.repeat(24),role:'recruitment_employee',departmentId:'dep_hr'},authRole:{permissions:[{resource:'application',action:'read',scope:'assigned'}]}};
 assert.equal(resourceFilter(narrowed,'application').assignedTo,narrowed.user.id);assert.equal(resourceFilter(narrowed,'candidate')._id.$in.length,0);assert.equal(resourceFilter(narrowed,'recruitment')._id.$in.length,0);
});
test('Session hydration reloads current role/department; credential changes and revocation reject stale tokens',async()=>{
 const secret=crypto.randomBytes(32).toString('hex'),id='1'.repeat(24),token=jwt.sign({id,cv:0,role:'admin'},secret),module={exports:{}};let user={_id:id,role:'recruitment_manager',departmentId:'dep_hr',isActive:true,credentialVersion:0},revoked=false;
 const deps={jsonwebtoken:jwt,crypto,'../models/user.model':{findById:()=>({select:()=>({lean:async()=>({...user})})})},'../models/role.model':{},'../models/revokedToken.model':{exists:async()=>revoked}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../middleware/auth.middleware.js'),'utf8'),{module,exports:module.exports,require:id=>deps[id],process:{env:{JWT_SECRET:secret}},console});
 async function hydrate(){const req={headers:{authorization:'Bearer '+token}},res=response();let next=false;await module.exports.verifyToken(req,res,()=>{next=true;});return{req,res,next};}
 assert.equal((await hydrate()).req.user.role,'recruitment_manager');user.role='recruitment_employee';user.departmentId='dep_audit';const fresh=await hydrate();assert.equal(fresh.req.user.role,'recruitment_employee');assert.equal(fresh.req.user.departmentId,'dep_audit');
 user.credentialVersion=1;assert.equal((await hydrate()).res.code,401);user.credentialVersion=0;revoked=true;assert.equal((await hydrate()).res.code,401);
});
