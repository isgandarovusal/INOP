const mongoose=require('mongoose');
const schema=new mongoose.Schema({_id:String,auditId:mongoose.Schema.Types.ObjectId,executionId:mongoose.Schema.Types.ObjectId,version:Number,actor:String,at:Date,status:String,answers:Array,details:mongoose.Schema.Types.Mixed,assessment:mongoose.Schema.Types.Mixed},{versionKey:false});
schema.pre('save',function(){if(!this.isNew)throw Error('Service audit history is immutable.');});
schema.pre(['updateOne','updateMany','findOneAndUpdate','replaceOne','findOneAndReplace','deleteOne','deleteMany','findOneAndDelete'],function(){throw Error('Service audit history is immutable.');});
module.exports=mongoose.models.ServiceAuditSave||mongoose.model('ServiceAuditSave',schema);
