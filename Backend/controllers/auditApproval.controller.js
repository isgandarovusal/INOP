const mongoose = require('mongoose');
const AuditApproval = require('../models/auditApproval.model');
const lifecycle = require('../services/auditLifecycle.service');
exports.resolveApprovalParent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(req.permission.scope === "all" ? 400 : 403).json({ message: "Invalid approval id" });
    }
    const approval = await AuditApproval.findById(req.params.id).select("_id auditId").lean();
    if (!approval) {
      return res.status(req.permission.scope === "all" ? 404 : 403).json({ message: "Approval not found" });
    }
    req.approvalParent = approval;
    req.auditScopeId = String(approval.auditId);
    next();
  } catch (error) {
    console.error("Approval parent error:", error);
    return res.status(500).json({ message: "Approval parent yoxlanıla bilmədi." });
  }
};


exports.createApproval = async (req,res) => { try { const data=await lifecycle.createApproval(req); await require('../services/notification.service').notifyUser({auditId:data.auditId,userId:data.reviewer,type:'approval-required',title:'Audit approval',message:'Audit approval requested.'});res.status(201).json({success:true,data}); } catch(error) {res.status(error.status||400).json({message:error.status?error.message:'Invalid approval data.'});} };
exports.updateApproval = async (req,res) => { try { res.json({success:true,data:await lifecycle.resolveApproval(req)}); } catch(error) {res.status(error.status||400).json({message:error.status?error.message:'Invalid approval data.'});} };
exports.getApprovals = async (req,res) => res.json({success:true,data:await AuditApproval.find({auditId:req.auditScopeId}).sort({createdAt:-1})});
