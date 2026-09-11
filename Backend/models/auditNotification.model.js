const mongoose = require("mongoose");


const auditNotificationSchema = new mongoose.Schema(
{
 auditId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"Audit",
  required:true
 },


 userId:{
  type:mongoose.Schema.Types.ObjectId,
  ref:"User"
 },


 type:{
  type:String,
  enum:[
   "assigned",
   "scheduled",
   "finding-created",
   "action-required",
   "approval-required",
   "deadline-warning",
   "completed"
  ],
  required:true
 },


 title:{
  type:String,
  required:true
 },


 message:{
  type:String,
  required:true
 },


 read:{
  type:Boolean,
  default:false
 },


 createdAt:{
  type:Date,
  default:Date.now
 }

},
{
 timestamps:true
});


module.exports =
mongoose.model(
 "AuditNotification",
 auditNotificationSchema
);
