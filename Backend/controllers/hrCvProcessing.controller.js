const mongoose = require('mongoose');
const Candidate = require('../models/candidate.model'),Jobs = require('../models/hrCvProcessingJob.model');
const processing = require('../services/hrCvProcessing.service');
const {verifyToken,getRolePermissions} = require('../middleware/auth.middleware');
const {resourceFilter} = require('../services/hrResourceScope.service');
const fail=(code,status)=>Object.assign(new Error('CV processing is unavailable.'),{code,status});
const authority=req=>JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
function endpoint(action){return async(req,res,next)=>{
 res.set('Cache-Control','private, no-store');
 try{
  if(!mongoose.isObjectIdOrHexString(req.params.id)||(req.params.jobId&&!mongoose.isObjectIdOrHexString(req.params.jobId)))throw fail('PROCESSING_INVALID_INPUT',400);
  const mutation=action==='start'||action==='retry',snapshot=authority(req),query=()=>({$and:[{_id:req.params.id},resourceFilter(req,'candidate'),...(mutation?[resourceFilter(req,'candidate','update')]:[])]});
  const refresh=async()=>{await verifyToken(req,res,()=>{});if(res.headersSent||res.destroyed)return false;req.authRole={permissions:await getRolePermissions(req.user.role)};if(authority(req)!==snapshot)throw fail('PROCESSING_AUTH_CHANGED',403);return true;};
  if(!await Candidate.exists(query()).maxTimeMS(1000))throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  if((action==='get'||action==='retry')&&!await Jobs.exists({_id:req.params.jobId,candidateId:req.params.id}).maxTimeMS(1000))throw fail('PROCESSING_JOB_UNAVAILABLE',404);
  const queue=processing.createProcessing();
  const result=action==='start'?await queue.enqueue(req,req.params.id,req.body):action==='retry'?await queue.retry(req,req.params.jobId,req.body):action==='get'?await queue.get(req,req.params.jobId):await queue.list(req,req.params.id);
  if(!await refresh())return;
  const parent=await Candidate.findOne(query()).select('cvUrl cvOriginal cvReview.version __v updatedAt +privateCvBlob').maxTimeMS(1000).lean();
  if(!parent)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
  const guard=item=>{if(item.candidateId!==String(new mongoose.Types.ObjectId(req.params.id)))throw fail('PROCESSING_JOB_UNAVAILABLE',404);const currentSource=processing.fingerprint(parent)===item.source.contextHash;return{...item,...(!currentSource?{result:undefined}:{}),currentSource};};
  const output=action==='list'?{...result,items:result.items.map(guard)}:guard(result);
  if(!await refresh())return;
  return res.status(mutation?202:200).json(output);
 }catch(error){if(res.headersSent||res.destroyed)return;if(error.code?.startsWith('PROCESSING_')&&error.status)return res.status(error.status).json({code:error.code,message:'CV processing is unavailable.'});next(error);}
};}
exports.start=endpoint('start');exports.get=endpoint('get');exports.list=endpoint('list');
exports.retry=endpoint('retry');
