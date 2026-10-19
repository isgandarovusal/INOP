const AuditFinding = require("../models/auditFinding.model");
const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.getFindings = async (req, res) => {
  try {
    const auditId = req.params.auditId;

    const audit = await findAuditByIdentifier(auditId);

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    if (req.permission?.scope === "assigned") {
      const allowed = await userHasAuditAccess(req, auditId);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Bu Audit-in finding-lərinə giriş icazəniz yoxdur.",
        });
      }
    }

    const data = await AuditFinding.find({
      auditId: audit._id,
    }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    require('../services/safeErrorLog.service').logFailure(error);

    return res.status(500).json({
      success: false,
      message: "Finding error",
    });
  }
};

exports.createFinding = async(req,res)=>{try{res.status(201).json({success:true,data:await require('../services/auditLifecycle.service').createFinding(req)});}catch(error){res.status(error.status||400).json({message:error.status?error.message:'Invalid finding data.'});}};
