const mongoose = require("mongoose");


const auditActionSchema = new mongoose.Schema(
{
 auditId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Audit",
  required:true
 },


 findingId:{type:mongoose.Schema.Types.ObjectId,ref:"AuditFinding"},
 createdBy:{type:String,immutable:true},
 executionId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"AuditExecution"
 },


 commandId:{type:String,select:false,immutable:true,maxlength:80},
 commandHash:{type:String,select:false,immutable:true},
 title:{
  type:String,
  required:true
 },


 description:String,


 priority:{
  type:String,
  enum:[
   "low",
   "medium",
   "high",
   "critical"
  ],
  default:"medium"
 },


 responsible:String,


 dueDate:Date,


 status:{
  type:String,
  enum:[
   "open",
   "in-progress",
   "completed",
   "verified",
   "rejected"
  ],
  default:"open"
 },


 completedAt:Date,
 completedBy:String,


 verifiedBy:String,


 evidenceIds:{type:[mongoose.Schema.Types.ObjectId],default:undefined},
 verificationNote:String


},
{
 timestamps:true
});


module.exports =
mongoose.model(
 "AuditAction",
 auditActionSchema
);
