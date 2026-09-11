const mongoose = require("mongoose");


const auditExecutionSchema = new mongoose.Schema(
{
 auditId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Audit",
  required:true
 },


 checklistId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"AuditTemplate"
 },


 answers:[
  {
   questionId:String,

   answer:String,

   score:{
    type:Number,
    default:0
   },

   comment:String
  }
 ],


 findings:[
  {
   title:String,

   severity:{
    type:String,
    enum:[
     "low",
     "medium",
     "high",
     "critical"
    ],
    default:"low"
   },

   description:String,

   status:{
    type:String,
    default:"open"
   }
  }
 ],


 correctiveActions:[
  {
   action:String,

   responsible:String,

   dueDate:Date,

   status:{
    type:String,
    default:"pending"
   }
  }
 ],


 totalScore:{
  type:Number,
  default:0
 },


 riskLevel:{
  type:String,
  default:"low"
 },


 status:{
  type:String,
  enum:[
   "draft",
   "in-progress",
   "completed",
   "approved",
   "archived"
  ],
  default:"draft"
 },


 createdBy:String

},
{
 timestamps:true
});


module.exports =
mongoose.model(
 "AuditExecution",
 auditExecutionSchema
);
