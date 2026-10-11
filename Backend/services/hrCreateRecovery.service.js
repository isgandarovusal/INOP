const {verifyToken,getRolePermissions}=require('../middleware/auth.middleware');
const {resourceFilter}=require('./hrResourceScope.service');
const Candidate=require('../models/candidate.model');
const fail=(status)=>Object.assign(new Error('Current authorization is unavailable.'),{status,code:status===401?'HR_AUTH_REQUIRED':'HR_PERMISSION_CHANGED'});
const identity=req=>JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
// Reuse the existing JWT/revocation/current-user contract after asynchronous IO.
async function current(req){
 const background=await require('./hrBackgroundActor.service').resolve(req);if(background)return background;
 const fresh={headers:req.headers};let status=200,verified=false;
 await verifyToken(fresh,{status(value){status=value;return this;},json(){return this;}},()=>{verified=true;});
 if(!verified)throw fail(status);
 if(!require('./hrDepartmentAccess.service').isHRMember(fresh.user))throw fail(403);
 fresh.authRole={permissions:await getRolePermissions(fresh.user.role)};
 return fresh;
}
async function creation(req,pipeline=false){
 const fresh=await current(req);
 for(const resource of pipeline?['candidate','application']:['candidate'])if(resourceFilter(fresh,resource,'create')._id?.$in?.length===0)throw fail(403);
 req.user=fresh.user;req.authRole=fresh.authRole;return identity(fresh);
}
async function failure(req,attempt){
 const body={code:attempt.candidateSaved?'CV_PIPELINE_PARTIAL':'CV_CREATE_UNCERTAIN',recoveryRequired:true,retrySafe:false};
 // Only a currently readable independently scoped Candidate id is exposed.
 // A missing/uncertain write does not authorize deletion or a blind retry.
 try{
  const fresh=await current(req),auth=identity(fresh);
  const row=await Candidate.findOne({$and:[{_id:attempt.candidateId},resourceFilter(fresh,'candidate')]}).select('_id').maxTimeMS(1000).lean();
  const latest=await current(req);
  if(row&&identity(latest)===auth)body.recovery={candidateId:String(row._id)};
 }catch{/* Fail closed without leaking raw database/auth details. */}
 return body;
}
function preserve(file){if(file)file.preserveOnError=true;}
module.exports={current,creation,failure,preserve,identity};
