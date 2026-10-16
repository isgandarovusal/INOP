const mongoose=require('mongoose');
const schema=new mongoose.Schema({_id:{type:String,required:true},userId:{type:String,required:true},objectId:{type:String,required:true},active:{type:Boolean,default:true},writeVersion:{type:Number,default:0},grantedBy:{type:String,required:true}},{timestamps:true});
module.exports=mongoose.models.HseObjectGrant||mongoose.model('HseObjectGrant',schema);
