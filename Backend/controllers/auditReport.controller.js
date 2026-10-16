const {
  findAuditByIdentifier,
  userHasAuditAccess,
} = require("../middleware/auditScope.middleware");

exports.getAuditReport = async (req, res) => {
  try {
    const auditId = req.params.id;

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
          message: "Bu Audit üzrə report-a giriş icazəniz yoxdur.",
        });
      }
    }

    const fullAudit = await require("../models/audit.model")
      .findById(audit._id)
      .lean();

    if (!fullAudit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found",
      });
    }

    const score = fullAudit.assessmentStatus && fullAudit.assessmentStatus !== 'scored' ? null :
      fullAudit.score ??
      fullAudit.overallScore ??
      fullAudit.overallPercentage ??
      0;

    const checks =
      fullAudit.checklist ||
      fullAudit.checks ||
      [];

    const report = {
      ...(fullAudit.templateSnapshot?.hseSource?{hse:{details:fullAudit.hseDetails||{},assessment:fullAudit.hseAssessment||{},object:fullAudit.hseObjectSnapshot}}:{}),
      ...(fullAudit.templateSnapshot?.standardSource?{standard:{details:fullAudit.standardDetails||{},assessment:fullAudit.standardAssessment||{}}}:{}),
      ...(fullAudit.templateSnapshot?.serviceSource?{service:{details:fullAudit.serviceDetails||{},assessment:fullAudit.serviceAssessment||{},nonconformities:checks.filter(a=>['0','0.5'].includes(a.answer)).length}}:{}),
      ...(fullAudit.auditType==='hr'&&fullAudit.hrAssessment?{hr:{details:fullAudit.hrDetails||{},assessment:fullAudit.hrAssessment,nonconformities:checks.filter(a=>['0','0.5'].includes(a.answer)).length}}:{}),
      id: fullAudit._id,
      auditId: fullAudit.id,
      type: fullAudit.auditType,
      status: fullAudit.status,
      score,
      summary: {
        totalChecks: checks.length,
        passed: checks.filter(
          (item) => item.status === "passed"
        ).length,
        failed: checks.filter(
          (item) => item.status === "failed"
        ).length,
      },
      safety: fullAudit.safetyDetails || null,
      createdAt: fullAudit.createdAt,
    };

    if(fullAudit.templateSnapshot?.hseSource&&fullAudit.hseAssessment)report.summary={totalChecks:fullAudit.hseAssessment.total,passed:fullAudit.hseAssessment.compliant,failed:fullAudit.hseAssessment.noncompliant};
    if(require("../services/auditReportBundle.service").kindOf(fullAudit)){
      report.bundle = await require("../services/auditReportBundle.service").build(fullAudit,req);
      if(!await require('../services/auditReportBundle.service').recheck(req,res,fullAudit,report.bundle,'audit.report'))return;
      report.score=report.bundle.percentage;
      if(fullAudit.standardAssessment)report.summary={totalChecks:fullAudit.standardAssessment.total,passed:fullAudit.standardAssessment.compliant,failed:fullAudit.standardAssessment.critical+fullAudit.standardAssessment.major+fullAudit.standardAssessment.minor};
      if(fullAudit.hrAssessment||fullAudit.serviceAssessment)report.summary={totalChecks:checks.length,passed:checks.filter(a=>a.answer==='1').length,failed:checks.filter(a=>['0','0.5'].includes(a.answer)).length};
      if(report.bundle.saves)report.bundle.saves=report.bundle.saves.map(({version,actor,at,status})=>({version,actor,at,status}));
    }
    return res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Audit report error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: "Report generation error",
    });
  }
};
