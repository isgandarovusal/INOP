const Candidate=require('../models/candidate.model');
const {resourceFilter}=require('./hrResourceScope.service');
const fail=()=>Object.assign(new Error('Private CV source parent is unavailable.'),{status:404,code:'INTAKE_SOURCE_UNAVAILABLE'});
// Sources awaiting their first uncertain write can be reconciled. Once linked,
// their immutable uploader/assignment is never a substitute for current parent
// authority. Completed-but-deleted parents are not recreated through replay.
async function checkLinked(req,row,write=false){
 if(!row.approval)return;
 const id=row.approval.candidateId;
 if(!await Candidate.exists({_id:id}).maxTimeMS(1000)){if(row.approval.completedAt)throw fail();return;}
 if(!await Candidate.exists({$and:[{_id:id},resourceFilter(req,'candidate'),...(write?[{archivedAt:null},resourceFilter(req,'candidate','create')]:[])]}).maxTimeMS(1000))throw fail();
}
module.exports={checkLinked};
