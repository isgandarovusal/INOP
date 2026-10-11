const mongoose=require('mongoose');
const schema=new mongoose.Schema({key:{type:String,required:true},count:{type:Number,default:0},expiresAt:Date},{autoCreate:false,autoIndex:false});
schema.index({key:1},{name:'hr_external_rate_unique',unique:true});schema.index({expiresAt:1},{name:'hr_external_rate_expiry',expireAfterSeconds:0});
module.exports=mongoose.models.HrExternalRate||mongoose.model('HrExternalRate',schema);
