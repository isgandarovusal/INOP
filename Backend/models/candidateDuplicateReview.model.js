const mongoose=require('mongoose');
const schema=new mongoose.Schema({pair:{type:[mongoose.Schema.Types.ObjectId],required:true},fingerprints:{type:[String],required:true},actor:{type:mongoose.Schema.Types.ObjectId,required:true},commandId:{type:String,required:true},decision:{type:String,enum:['same_person','different_people','uncertain'],required:true},note:{type:String,maxlength:1000,default:''}},{timestamps:true});
schema.index({actor:1,commandId:1},{unique:true});schema.index({pair:1,createdAt:-1});
module.exports=mongoose.model('CandidateDuplicateReview',schema);
