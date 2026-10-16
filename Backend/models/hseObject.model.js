const mongoose=require('mongoose');
const schema=new mongoose.Schema({id:{type:String,unique:true,required:true,immutable:true},organizationId:{type:String,required:true,immutable:true},objectType:{type:String,enum:['office','warehouse'],required:true,immutable:true},name:{type:String,required:true},location:String,active:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.models.HseObject||mongoose.model('HseObject',schema);
