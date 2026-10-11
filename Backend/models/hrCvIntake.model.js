const mongoose=require('mongoose');
const schema=new mongoose.Schema({
 createdBy:{type:mongoose.Schema.Types.ObjectId,required:true},assignedTo:{type:mongoose.Schema.Types.ObjectId,required:true},departmentId:{type:String,default:''},
 origin:{type:new mongoose.Schema({key:{type:String,enum:['outlook','kfc','pizzahut','jobsearch','external_form']},identityHash:String,receivedAt:Date,jobId:mongoose.Schema.Types.ObjectId,matchReason:String},{_id:false}),select:false},
 taskVersion:{type:String,required:true,immutable:true},commandKey:{type:String,required:true,select:false},original:{originalName:String,mimeType:String,size:Number,sha256:String},
 blob:{type:mongoose.Schema.Types.Mixed,required:true,select:false},evidenceMode:{type:String,enum:['provider','test'],required:true},
 state:{type:String,enum:['reserved','queued','running','retry','ready','blocked','quarantined','failed','cancelled'],required:true},code:String,
 uploadAttempts:{type:Number,default:0,min:0,max:3},attempts:{type:Number,default:0,min:0,max:3},
 queueSlot:{type:Number,min:0,max:63},actorSlot:{type:Number,min:0,max:3},leaseToken:{type:String,select:false},leaseUntil:Date,nextAttemptAt:Date,
 approval:{type:new mongoose.Schema({actor:mongoose.Schema.Types.ObjectId,departmentId:String,profile:{type:mongoose.Schema.Types.Mixed},notes:String,profileHash:String,contextHash:String,sourceUpdatedAt:Date,candidateId:mongoose.Schema.Types.ObjectId,applicationId:mongoose.Schema.Types.ObjectId,jobId:mongoose.Schema.Types.ObjectId,at:Date,completedAt:Date},{_id:false}),select:false},
 scan:{engine:String,version:String,sha256:String,at:Date},result:{type:mongoose.Schema.Types.Mixed,select:false},
 events:{type:[new mongoose.Schema({state:String,code:String,at:Date,attempt:Number},{_id:false})],default:[]},
},{timestamps:true,autoCreate:false,autoIndex:false,toJSON:{transform:(_doc,row)=>{for(const k of ['blob','commandKey','leaseToken','result','queueSlot','actorSlot','approval','origin'])delete row[k];return row;}}});
schema.index({commandKey:1},{unique:true,name:'hr_intake_command_unique'});
schema.index({queueSlot:1},{unique:true,name:'hr_intake_queue_slot',partialFilterExpression:{queueSlot:{$type:'number'}}});
schema.index({createdBy:1,actorSlot:1},{unique:true,name:'hr_intake_actor_slot',partialFilterExpression:{actorSlot:{$type:'number'}}});
schema.index({state:1,nextAttemptAt:1,leaseUntil:1,createdAt:1},{name:'hr_intake_claim'});
for(const field of ['createdBy','departmentId','assignedTo'])schema.index({[field]:1,createdAt:-1,_id:-1},{name:'hr_intake_'+field+'_page'});
schema.index({createdAt:-1,_id:-1},{name:'hr_intake_page'});
// No startup DDL, TTL, retention/deletion or automatic Candidate creation.
module.exports=mongoose.models.HrCvIntake||mongoose.model('HrCvIntake',schema);
