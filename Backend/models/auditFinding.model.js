const mongoose = require("mongoose");


const auditFindingSchema = new mongoose.Schema(
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

 description:{
  type:String
 },

 category:{
  type:String,
  enum:[
   "quality",
   "service",
   "safety",
   "compliance"
  ],
  default:"quality"
 },

 severity:{
  type:String,
  enum:[
   "low",
   "medium",
   "high",
   "critical"
  ],
  default:"medium"
 },

 status:{
  type:String,
  enum:[
   "open",
   "assigned",
   "in-progress",
   "resolved",
   "closed"
  ],
  default:"open"
 },

 responsibleUser:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },

 dueDate:{
  type:Date
 },

 evidence:[
  {
   file:String,
   note:String,
   createdAt:{
    type:Date,
    default:Date.now
   }
  }
 ]

},
{
 timestamps:true
});


module.exports =
mongoose.model(
 "AuditFinding",
 auditFindingSchema
);
