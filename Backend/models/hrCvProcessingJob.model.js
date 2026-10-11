const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, required: true },
  contextKey: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  sourceFingerprint: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  sourceHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  sourceRevision: { type: Number, required: true, min: 0 },
  kind: { type: String, enum: ['parse','ai-review','ocr'], required: true },
  taskVersion: {type:String,match:/^[a-z0-9-]{1,64}$/},
  state: { type: String, enum: ['queued','running','retry','succeeded','failed','blocked','cancelled'], required: true },
  attempts: { type: Number, default: 0, min: 0, max: 3 },
  manualRetries: { type: Number, default: 0, min: 0, max: 2 },
  retryActorId: { type: mongoose.Schema.Types.ObjectId, select: false },
  retryCommandHash: { type: String, select: false },
  queueSlot: { type: Number, min: 0, max: 63 },
  actorSlot: { type: Number, min: 0, max: 3 },
  leaseToken: { type: String, select: false }, leaseUntil: Date, nextAttemptAt: Date,
  code: { type: String, default: 'QUEUED' },
  result: { type: mongoose.Schema.Types.Mixed, select: false },
  events: { type: [new mongoose.Schema({ state: String, code: String, at: Date, attempt: Number, actorId: mongoose.Schema.Types.ObjectId }, { _id: false })], default: [] },
}, { timestamps: true, autoCreate: false, autoIndex: false,
  toJSON: { transform: (_doc,row) => { for(const field of ['leaseToken','result','queueSlot','actorSlot','contextKey','sourceFingerprint','retryActorId','retryCommandHash']) delete row[field];return row; } } });
schema.index({contextKey:1},{unique:true,name:'hr_processing_context_unique'});
schema.index({queueSlot:1},{unique:true,name:'hr_processing_queue_slot',partialFilterExpression:{queueSlot:{$type:'number'}}});
schema.index({actorId:1,actorSlot:1},{unique:true,name:'hr_processing_actor_slot',partialFilterExpression:{actorSlot:{$type:'number'}}});
schema.index({state:1,nextAttemptAt:1,leaseUntil:1,createdAt:1},{name:'hr_processing_claim'});
schema.index({candidateId:1,createdAt:-1,_id:-1},{name:'hr_processing_candidate'});
// No TTL/automatic deletion: retention duration and historical recovery policy need approval.
module.exports = mongoose.models.HrCvProcessingJob || mongoose.model('HrCvProcessingJob',schema);
