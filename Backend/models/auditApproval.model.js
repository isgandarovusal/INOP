const mongoose = require("mongoose");


const auditApprovalSchema = new mongoose.Schema(
{
 auditId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Audit",
  required:true
 },


 findingId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"AuditFinding"
 },


 actionId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"AuditAction"
 },


 requestedBy:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },


 reviewer:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },


 status:{
  type:String,
  enum:[
   "pending",
   "approved",
   "rejected"
  ],
  default:"pending"
 },


 comment:{
  type:String,
  default:""
 },


 approvedAt:{
  type:Date
 }

},
{
 timestamps:true
});


module.exports =
 mongoose.model(
  "AuditApproval",
  auditApprovalSchema
);
