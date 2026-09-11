const mongoose = require("mongoose");


const auditAssignmentSchema =
new mongoose.Schema(
{

 auditId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Audit",
  required:true
 },


 auditor:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User",
  required:true
 },


 assignedBy:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },


 status:{
  type:String,
  enum:[
   "assigned",
   "accepted",
   "started",
   "completed"
  ],
  default:"assigned"
 },


 assignedAt:{
  type:Date,
  default:Date.now
 }

},
{
 timestamps:true
});


module.exports =
mongoose.model(
"AuditAssignment",
auditAssignmentSchema
);
