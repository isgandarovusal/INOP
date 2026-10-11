const mongoose = require('mongoose');
const Job = require('../models/job.model');
const authority = require('../services/hrCreateRecovery.service');
const { resourceFilter } = require('../services/hrResourceScope.service');
const fail = (status, code) => Object.assign(new Error('Job archive operation is unavailable.'), { status, code });
const query = (req, id, action='read') => ({ $and: [{_id:id},resourceFilter(req,'recruitment'),resourceFilter(req,'recruitment',action)] });
function handler(action) { return async (req,res) => {
  res.set('Cache-Control','private, no-store');
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) throw fail(400,'INVALID_JOB_ID');
    const input=req.body||{}, legacy=req.method==='DELETE';
    if (Object.keys(input).some(k=>!['expectedRevision','reason'].includes(k)) || (!legacy && !Number.isInteger(input.expectedRevision)) || input.expectedRevision!==undefined && (!Number.isInteger(input.expectedRevision)||input.expectedRevision<0) || input.reason!==undefined && (typeof input.reason!=='string'||input.reason.length>500)) throw fail(400,'ARCHIVE_INPUT');
    let fresh=await authority.current(req);
    const grant=action==='archive'?'delete':'update', row=await Job.findOne(query(fresh,req.params.id,grant)).select('_id archivedAt __v').lean();
    if (!row) throw fail(404,'JOB_UNAVAILABLE');
    const revision=row.__v??0;
    if (input.expectedRevision!==undefined && input.expectedRevision!==revision) throw fail(409,'REVISION_CONFLICT');
    const already=action==='archive'?Boolean(row.archivedAt):!row.archivedAt;
    if (already) return res.json({jobId:String(row._id),archived:Boolean(row.archivedAt),revision,replayed:true});
    const signature=authority.identity(fresh);fresh=await authority.current(req);
    if (authority.identity(fresh)!==signature) throw fail(403,'HR_PERMISSION_CHANGED');
    const at=new Date(), exact=query(fresh,row._id,grant);exact.$and.push({__v:row.__v===undefined?{$exists:false}:revision});
    const updated=await Job.findOneAndUpdate(exact,{$set:{archivedAt:action==='archive'?at:null,archivedBy:action==='archive'?fresh.user.id:null},$inc:{__v:1},$push:{archiveHistory:{action,actor:fresh.user.id,at,reason:(input.reason||'').trim(),revision:revision+1}}},{returnDocument:'after',runValidators:true}).select('_id archivedAt __v').lean();
    if (!updated) throw fail(409,'REVISION_CONFLICT');
    if (authority.identity(await authority.current(req))!==signature) throw fail(403,'HR_PERMISSION_CHANGED');
    return res.json({jobId:String(updated._id),archived:Boolean(updated.archivedAt),revision:updated.__v,replayed:false});
  } catch(error) {return res.status(error.status||500).json({code:error.code||'ARCHIVE_UNAVAILABLE',message:'Job archive operation is unavailable.'});}
}; }
exports.archive=handler('archive');exports.restore=handler('restore');
exports.history=async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) throw fail(400,'INVALID_JOB_ID');
    const fresh=await authority.current(req), signature=authority.identity(fresh);
    const row=await Job.findOne(query(fresh,req.params.id)).select('_id +archiveHistory').slice('archiveHistory',-50).lean();
    if(!row)throw fail(404,'JOB_UNAVAILABLE');
    if(authority.identity(await authority.current(req))!==signature)throw fail(403,'HR_PERMISSION_CHANGED');
    return res.json({items:row.archiveHistory||[],limit:50});
  }catch(error){return res.status(error.status||500).json({code:error.code||'ARCHIVE_UNAVAILABLE',message:'Job archive history is unavailable.'});}
};
