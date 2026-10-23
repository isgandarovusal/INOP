const mongoose=require('mongoose');
// Admission receipts only: originals and processing remain in HrCvIntake.
const row=new mongoose.Schema({id:String,commandId:String,originalName:String,mimeType:String,size:Number,sha256:String,context:mongoose.Schema.Types.Mixed,state:{type:String,enum:['pending','accepted','failed','uncertain']},code:String,sourceId:String,attempts:{type:Number,default:0},events:{type:[{state:String,code:String,at:Date}],default:[]}},{_id:false});
const schema=new mongoose.Schema({batchId:{type:String,required:true},createdBy:{type:mongoose.Schema.Types.ObjectId,required:true},assignedTo:{type:mongoose.Schema.Types.ObjectId,required:true},departmentId:String,identity:{type:String,required:true,select:false},rows:{type:[row],required:true}},{timestamps:true,autoCreate:false,autoIndex:false});
schema.index({batchId:1},{unique:true,name:'hr_import_identity'});
for(const field of ['createdBy','assignedTo','departmentId'])schema.index({[field]:1,createdAt:-1,_id:-1});
module.exports=mongoose.models.HrCvImport||mongoose.model('HrCvImport',schema);
