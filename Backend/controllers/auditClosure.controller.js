const Closure=require('../models/auditClosure.model');
exports.closeAudit=async(req,res)=>{try{res.status(201).json({success:true,data:await require('../services/auditLifecycle.service').closeAudit(req)});}catch(error){res.status(error.status||500).json({message:error.status?error.message:'Audit closure failed.'});}};
exports.getClosure=async(req,res)=>res.json({success:true,data:await Closure.findOne({auditId:req.auditScopeId}).sort({createdAt:-1})});
