const mongoose = require("mongoose");


const auditActionSchema = new mongoose.Schema(
{
 auditId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Audit",
  required:true
 },


 executionId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"AuditExecution"
 },


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


 createdBy: String,

 completedBy: String,

 completedAt:Date,

 verifiedAt: Date,


 verifiedBy:String,


 verificationNote:String


},
{
 timestamps:true
});


auditActionSchema.index({ auditId: 1, status: 1, createdAt: -1 });

auditActionSchema.index({ auditId: 1, createdAt: -1, _id: -1 });

auditActionSchema.index({ auditId: 1, updatedAt: -1 });

module.exports =
mongoose.model(
 "AuditAction",
 auditActionSchema
);
