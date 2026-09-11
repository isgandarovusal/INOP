const mongoose=require("mongoose");


const auditTimelineSchema =
new mongoose.Schema(
{

auditId:{
 type:mongoose.Schema.Types.ObjectId,
 ref:"Audit",
 required:true
},

action:{
 type:String,
 required:true
},


description:{
 type:String
},


user:{
 type:mongoose.Schema.Types.ObjectId,
 ref:"User"
}


},
{
timestamps:true
});


module.exports =
mongoose.model(
"AuditTimeline",
auditTimelineSchema
);
