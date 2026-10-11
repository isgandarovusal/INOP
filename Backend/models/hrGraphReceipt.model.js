const mongoose=require('mongoose');
const schema=new mongoose.Schema({identityHash:{type:String,required:true,select:false},createdBy:{type:mongoose.Schema.Types.ObjectId,required:true},departmentId:{type:String,default:''},state:{type:String,enum:['reserved','acknowledged','unsupported'],required:true},sourceId:{type:mongoose.Schema.Types.ObjectId,select:false},origin:{type:mongoose.Schema.Types.Mixed,select:false}},{timestamps:true,autoCreate:false,autoIndex:false});
schema.index({identityHash:1},{unique:true,name:'hr_graph_attachment_unique'});
module.exports=mongoose.models.HrGraphReceipt||mongoose.model('HrGraphReceipt',schema);
