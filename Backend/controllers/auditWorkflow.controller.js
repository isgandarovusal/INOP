const { transition } = require('../services/auditLifecycle.service');
exports.updateAuditStatus = async (req,res) => { try { res.json({success:true,data:await transition(req)}); } catch(error) { res.status(error.status||500).json({message:error.status?error.message:'Audit transition failed.'}); } };
