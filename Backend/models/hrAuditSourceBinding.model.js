const mongoose=require('mongoose');
// Built-in _id uniqueness serializes explicit provisioning without a migration.
const schema=new mongoose.Schema({_id:String,templateId:{type:mongoose.Schema.Types.ObjectId,required:true},revisionId:{type:mongoose.Schema.Types.ObjectId,required:true}},{timestamps:true});
module.exports=mongoose.models.HrAuditSourceBinding||mongoose.model('HrAuditSourceBinding',schema);
