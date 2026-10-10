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


 reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

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


auditApprovalSchema.index({ auditId: 1, createdAt: -1, _id: -1 });

module.exports =
 mongoose.model(
  "AuditApproval",
  auditApprovalSchema
);
