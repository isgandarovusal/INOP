const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Candidate = require('../models/candidate.model');
const Jobs = require('../models/hrCvProcessingJob.model');
const processing = require('./hrCvProcessing.service');
const { resourceFilter } = require('./hrResourceScope.service');
const { verifyToken, getRolePermissions } = require('../middleware/auth.middleware');
const fields = ['name','role','email','phone','phoneRaw','education','experience','skills','languages','certificates','employmentHistory','educationHistory','certificationHistory'];
const fail = (code,status) => Object.assign(new Error('CV approval is unavailable.'),{code,status});
const authority = req => JSON.stringify([req.user.id,req.user.role,req.user.departmentId,req.authRole.permissions]);
const query = (req,id,extra={}) => ({$and:[{_id:id,...extra},resourceFilter(req,'candidate'),resourceFilter(req,'candidate','update')]});

// Only the existing Candidate save writes an approval receipt: one atomic write,
// no cross-collection partial approval or automatic application of extracted facts.
async function prepare(req,res,current,update) {
 let input=req.body.processingApproval;
 if(typeof input==='string'){try{input=JSON.parse(input);}catch{throw fail('PROCESSING_APPROVAL_INPUT',400);}}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['jobId','contextHash','expectedJobUpdatedAt'].includes(k))||!mongoose.isObjectIdOrHexString(input.jobId)||typeof input.contextHash!=='string'||!/^[a-f0-9]{64}$/.test(input.contextHash)||typeof input.expectedJobUpdatedAt!=='string'||!Number.isFinite(Date.parse(input.expectedJobUpdatedAt))||new Date(input.expectedJobUpdatedAt).toISOString()!==input.expectedJobUpdatedAt||req.file||!((typeof req.body.expectedRevision==='number'||(typeof req.body.expectedRevision==='string'&&/^(0|[1-9]\d*)$/.test(req.body.expectedRevision)))&&Number.isSafeInteger(Number(req.body.expectedRevision))&&Number(req.body.expectedRevision)>=0)||!['confirmed','corrected'].includes(req.body.reviewStatus))throw fail('PROCESSING_APPROVAL_INPUT',400);
 if(req.body.status!==undefined)throw fail('PROCESSING_APPROVAL_INPUT',400);
 const snapshot=authority(req),plain=current.toObject(),contextHash=processing.fingerprint(plain);
 if(contextHash!==input.contextHash)throw fail('PROCESSING_SOURCE_CHANGED',409);
 if(!await Jobs.exists({_id:input.jobId,candidateId:current._id}).maxTimeMS(1000))throw fail('PROCESSING_JOB_UNAVAILABLE',404);
 const row=await Jobs.findOne({_id:input.jobId,candidateId:current._id}).select('kind taskVersion').maxTimeMS(1000).lean();
 if(!row||(row.kind!=='parse'&&row.taskVersion!==({ocr:'ocr-rules-1','ai-review':'ai-professional-1'})[row.kind]))throw fail('PROCESSING_JOB_UNAVAILABLE',404);
 const job=await require('./hrCvTaskProfiles.service').profile(row?.kind).get(req,input.jobId);
 if(!job.currentSource||job.source.contextHash!==contextHash||job.source.revision!==(plain.__v||0)||job.source.sha256!==plain.cvOriginal?.sha256||new Date(job.updatedAt).toISOString()!==input.expectedJobUpdatedAt)throw fail('PROCESSING_SOURCE_CHANGED',409);
 const result=job.result;
 const contract=job.kind==='parse'?['rules-2','rule-based']:job.kind==='ocr'?['ocr-rules-1','tesseract-rules']:job.kind==='ai-review'?['ai-professional-1','openai-professional-evidence']:null;
 if(!contract||job.state!=='succeeded'||result?.requiresApproval!==true||result.parserVersion!==contract[0]||result.review?.version!==contract[0]||result.review?.provider!==contract[1]||!result.parsed)throw fail('PROCESSING_APPROVAL_UNAVAILABLE',409);
 await verifyToken(req,res,()=>{});if(res.headersSent||res.destroyed)return null;
 req.authRole={permissions:await getRolePermissions(req.user.role)};
 if(authority(req)!==snapshot)throw fail('PROCESSING_AUTH_CHANGED',403);
 const fresh=await Candidate.findOne(query(req,current._id)).select('cvUrl cvOriginal cvReview.version __v updatedAt +privateCvBlob +privateCvArchive').maxTimeMS(1000).lean();
 if(!fresh)throw fail('PROCESSING_PARENT_UNAVAILABLE',404);
 if(processing.fingerprint(fresh)!==contextHash)throw fail('PROCESSING_SOURCE_CHANGED',409);
 const approvedFields=fields.filter(field=>Object.hasOwn(update,field));
 if(!approvedFields.length)throw fail('PROCESSING_APPROVAL_INPUT',400);
 const correctedFields=approvedFields.filter(field=>JSON.stringify(update[field])!==JSON.stringify(result.parsed[field]));
 update.cvReview={...result.review,processingStatus:'extracted',reviewStatus:correctedFields.length?'corrected':'confirmed',correctedFields,reviewedBy:req.user.id,reviewedAt:new Date(),
  processingApproval:{jobId:job.id,parserVersion:result.parserVersion,sourceHash:job.source.sha256,sourceContextHash:contextHash,sourceRevision:job.source.revision,approvedBy:req.user.id,approvedAt:new Date(),profileHash:crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(approvedFields.map(field=>[field,update[field]])))).digest("hex"),resultHash:crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex'),approvedFields}};
 // Exact source fields protect even edits/replacements that did not increment __v.
 const exact={updatedAt:plain.updatedAt,cvUrl:plain.cvUrl,cvOriginal:plain.cvOriginal,privateCvBlob:plain.privateCvBlob??{$exists:false},privateCvArchive:plain.privateCvArchive??{$exists:false},'cvReview.version':plain.cvReview?.version??{$exists:false}};
 return query(req,current._id,{__v:plain.__v===undefined?{$exists:false}:plain.__v,...exact});
}
module.exports={prepare,query};
