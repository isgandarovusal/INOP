const mongoose = require('mongoose');
const schema = new mongoose.Schema({
 candidateId: {type: mongoose.Schema.Types.ObjectId, required: true},
 actorId: {type: mongoose.Schema.Types.ObjectId, required: true},
 contextKey: {type: String, required: true, match: /^[a-f0-9]{64}$/, select: false},
 sourceFingerprint: {type: String, required: true, match: /^[a-f0-9]{64}$/, select: false},
 sourceRevision: {type: Number, required: true, min: 0},
 sourceHash: {type: String, required: true, match: /^[a-f0-9]{64}$/},
 blob: {type: mongoose.Schema.Types.Mixed, select: false},
 evidenceMode: {type: String, enum: ['provider','test'], required: true},
 state: {type: String, enum: ['reserved','running','retry','blocked','verified','obsolete','failed'], required: true},
 code: {type: String, required: true},
 attempts: {type: Number, default: 0, min: 0, max: 3},
 slot: {type: Number, min: 0, max: 7, select: false},
 leaseToken: {type: String, select: false}, leaseUntil: Date,
 scan: {type: new mongoose.Schema({engine: String, version: String, sha256: String, at: Date}, {_id:false}), select:false},
 verifiedAt: Date,
}, {timestamps:true,autoCreate:false,autoIndex:false,toJSON:{transform:(_doc,row)=>{
 for(const key of ['blob','contextKey','sourceFingerprint','slot','leaseToken','scan'])delete row[key];return row;
}}});
schema.index({contextKey:1},{unique:true,name:'hr_original_context_unique'});
schema.index({slot:1},{unique:true,name:'hr_original_active_slot',partialFilterExpression:{slot:{$type:'number'}}});
schema.index({candidateId:1,createdAt:-1},{name:'hr_original_candidate'});
// Preserve every original: no TTL, automatic deletion, backfill or startup DDL.
module.exports=mongoose.models.HrCvOriginalManifest||mongoose.model('HrCvOriginalManifest',schema);
