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


 completedAt:Date,


 verifiedBy:String,


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
