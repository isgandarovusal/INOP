const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");

const Audit = require("../models/audit.model");
const AuditFinding = require("../models/auditFinding.model");
const AuditApproval = require("../models/auditApproval.model");
const AuditClosure = require("../models/auditClosure.model");

function getOptionalModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

async function buildAuditData(auditId) {
  if (!mongoose.Types.ObjectId.isValid(auditId)) {
    const error = new Error("Invalid audit id");
    error.statusCode = 400;
    throw error;
  }

  const audit = await Audit.findById(auditId);

  if (!audit) {
    const error = new Error("Audit not found");
    error.statusCode = 404;
    throw error;
  }

  const AuditAction = getOptionalModel("AuditAction");

  const [findings, approvals, closures, actions] = await Promise.all([
    AuditFinding.find({ auditId })
      .sort({ createdAt: 1 })
      .lean(),

    AuditApproval.find({ auditId })
      .sort({ createdAt: 1 })
      .lean(),

    AuditClosure.find({ auditId })
      .sort({ createdAt: 1 })
      .lean(),

    AuditAction
      ? AuditAction.find({ auditId })
          .sort({ createdAt: 1 })
          .lean()
      : Promise.resolve([])
  ]);

  return {
    audit: audit.toObject(),
    findings,
    approvals,
    actions,
    closures
  };
}

function safeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if (value.name) return value.name;
    if (value.email) return value.email;
    if (value._id) return String(value._id);

    return JSON.stringify(value);
  }

  return String(value);
}

function csvEscape(value) {
  const text = safeValue(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

exports.exportCsv = async (req, res) => {
  try {
    const data = await buildAuditData(req.params.auditId);

    const rows = [
      ["AUDIT REPORT"],
      [],
      ["Audit ID", safeValue(data.audit._id)],
      ["Status", safeValue(data.audit.status)],
      ["Created At", safeValue(data.audit.createdAt)],
      ["Updated At", safeValue(data.audit.updatedAt)],
      [],
      ["FINDINGS"],
      [
        "ID",
        "Title",
        "Description",
        "Status",
        "Priority",
        "Created At"
      ]
    ];

    data.findings.forEach((finding) => {
      rows.push([
        safeValue(finding._id),
        safeValue(finding.title),
        safeValue(finding.description),
        safeValue(finding.status),
        safeValue(finding.priority),
        safeValue(finding.createdAt)
      ]);
    });

    rows.push([]);
    rows.push(["APPROVALS"]);
    rows.push([
      "ID",
      "Status",
      "Comment",
      "Requested By",
      "Reviewer",
      "Created At",
      "Approved At"
    ]);

    data.approvals.forEach((approval) => {
      rows.push([
        safeValue(approval._id),
        safeValue(approval.status),
        safeValue(approval.comment),
        safeValue(approval.requestedBy),
        safeValue(approval.reviewer),
        safeValue(approval.createdAt),
        safeValue(approval.approvedAt)
      ]);
    });

    rows.push([]);
    rows.push(["ACTIONS"]);
    rows.push([
      "ID",
      "Title",
      "Status",
      "Deadline",
      "Responsible User",
      "Created At"
    ]);

    data.actions.forEach((action) => {
      rows.push([
        safeValue(action._id),
        safeValue(action.title || action.name || action.description),
        safeValue(action.status),
        safeValue(action.deadline),
        safeValue(
          action.responsibleUser ||
          action.assignedTo ||
          action.responsible
        ),
        safeValue(action.createdAt)
      ]);
    });

    rows.push([]);
    rows.push(["CLOSURES"]);
    rows.push([
      "ID",
      "Final Status",
      "Approval Status",
      "Comment",
      "Closed By",
      "Closed At"
    ]);

    data.closures.forEach((closure) => {
      rows.push([
        safeValue(closure._id),
        safeValue(closure.finalStatus),
        safeValue(closure.approvalStatus),
        safeValue(closure.comment),
        safeValue(closure.closedBy),
        safeValue(closure.closedAt)
      ]);
    });

    const csv = rows
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-${req.params.auditId}.csv"`
    );

    return res.send("\ufeff" + csv);

  } catch (error) {
    const statusCode = error.statusCode || error.status || 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 400
          ? "Audit ID düzgün deyil."
          : "Audit export zamanı server xətası baş verdi.",
    });
  }
};


exports.exportExcel = async (req, res) => {
  try {
    const data = await buildAuditData(req.params.auditId);

    const auditRows = [
      {
        Field: "Audit ID",
        Value: safeValue(data.audit._id)
      },
      {
        Field: "Status",
        Value: safeValue(data.audit.status)
      },
      {
        Field: "Created At",
        Value: safeValue(data.audit.createdAt)
      },
      {
        Field: "Updated At",
        Value: safeValue(data.audit.updatedAt)
      }
    ];

    const findingRows = data.findings.map((finding) => ({
      ID: safeValue(finding._id),
      Title: safeValue(finding.title),
      Description: safeValue(finding.description),
      Status: safeValue(finding.status),
      Priority: safeValue((data.audit.auditType==='hr'||(data.audit.templateSnapshot?.serviceSource||data.audit.templateSnapshot?.standardSource||data.audit.templateSnapshot?.hseSource))?finding.severity:finding.priority),
      ...((data.audit.templateSnapshot?.serviceSource||data.audit.templateSnapshot?.standardSource||data.audit.templateSnapshot?.hseSource)?{EvidenceIds:(finding.evidenceIds||[]).join(', ')}:{}),
      ...((data.audit.templateSnapshot?.standardSource||data.audit.templateSnapshot?.hseSource)?{Code:finding.code||'',StandardId:finding.standardId||'',CatalogVersion:finding.catalogVersion||'',SourceRisk:finding.sourceRisk||'',Section:data.audit.templateSnapshot.sections.find(s=>s.questions.some(q=>q.id===finding.standardId))?.title||'',CorrectiveActions:data.audit.templateSnapshot?.hseSource?'See Actions (FindingId)':JSON.stringify(data.actions.filter(a=>String(a.findingId)===String(finding._id)).map(a=>({id:String(a._id),title:a.title,responsible:a.responsible,dueDate:a.dueDate,status:a.status,evidenceIds:a.evidenceIds}))),ApprovalIds:data.approvals.map(a=>String(a._id)).join(', '),ClosureIds:data.closures.map(c=>String(c._id)).join(', ')}:{}),
      CreatedAt: safeValue(finding.createdAt)
    }));

    const approvalRows = data.approvals.map((approval) => ({
      ID: safeValue(approval._id),
      Status: safeValue(approval.status),
      Comment: safeValue(approval.comment),
      RequestedBy: safeValue(approval.requestedBy),
      Reviewer: safeValue(approval.reviewer),
      CreatedAt: safeValue(approval.createdAt),
      ...((data.audit.templateSnapshot?.standardSource||data.audit.templateSnapshot?.hseSource)?{ApplicabilityReview:data.audit.templateSnapshot?.hseSource?'See HSE Applicability':JSON.stringify(approval.applicabilityReview||{})}:{}),
      ApprovedAt: safeValue(approval.approvedAt)
    }));

    const actionRows = data.actions.map((action) => ({
      ...(data.audit.templateSnapshot?.hseSource?{FindingId:String(action.findingId||''),ExecutionId:String(action.executionId||'')}:{}),
      ID: safeValue(action._id),
      Title: safeValue(
        action.title ||
        action.name ||
        action.description
      ),
      Status: safeValue(action.status),
      Deadline: safeValue((data.audit.auditType==='hr'||(data.audit.templateSnapshot?.serviceSource||data.audit.templateSnapshot?.standardSource||data.audit.templateSnapshot?.hseSource))?action.dueDate:action.deadline),
      ResponsibleUser: safeValue(
        action.responsibleUser ||
        action.assignedTo ||
        action.responsible
      ),
      ...((data.audit.templateSnapshot?.serviceSource||data.audit.templateSnapshot?.standardSource||data.audit.templateSnapshot?.hseSource)?{Description:action.description||'',EvidenceIds:(action.evidenceIds||[]).join(', '),VerificationNote:action.verificationNote||'',VerifiedBy:action.verifiedBy||'',CompletedAt:action.completedAt||''}:{}),
      CreatedAt: safeValue(action.createdAt)
    }));

    const closureRows = data.closures.map((closure) => ({
      ID: safeValue(closure._id),
      FinalStatus: safeValue(closure.finalStatus),
      ApprovalStatus: safeValue(closure.approvalStatus),
      Comment: safeValue(closure.comment),
      ClosedBy: safeValue(closure.closedBy),
      ClosedAt: safeValue(closure.closedAt)
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(auditRows),
      "Audit"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        findingRows.length
          ? findingRows
          : [{ Message: "No findings" }]
      ),
      "Findings"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        approvalRows.length
          ? approvalRows
          : [{ Message: "No approvals" }]
      ),
      "Approvals"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        actionRows.length
          ? actionRows
          : [{ Message: "No actions" }]
      ),
      "Actions"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        closureRows.length
          ? closureRows
          : [{ Message: "No closures" }]
      ),
      "Closures"
    );

    if(data.audit.auditType==='hr'&&data.audit.templateSnapshot?.hrSource){
      const snapshot=data.audit.templateSnapshot,assessment=data.audit.hrAssessment,details=data.audit.hrDetails||{};
      const answers=new Map((data.audit.checks||[]).map(a=>[a.questionId,a]));
      const editorial=require('../config/hrAuditEditorial.json');
      const rows=snapshot.sections.flatMap(section=>section.questions.map(q=>({Section:section.title,SectionAZ:editorial.entries[section.id]?.az||section.title,Criterion:q.label,CriterionAZ:editorial.entries[q.id]?.az||q.label,CriterionEN:editorial.entries[q.id]?.en||q.label,CriterionRU:editorial.entries[q.id]?.ru||q.label,GuidanceAZ:editorial.entries[q.id]?.guidance?.az||q.guidance||'',Guidance:q.guidance||'',SourceCell:q.sourceCell,Answer:answers.get(q.id)?.answer||'',Note:answers.get(q.id)?.comment||''})));
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(rows),'HR Criteria');
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(snapshot.sections.map(s=>({Section:s.title,Percentage:assessment?.sections?.find(a=>a.id===s.id)?.percentage??'',Note:details.sectionNotes?.[s.id]||''}))),'HR Sections');
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet([{Brand:snapshot.brandName,SourceSHA256:snapshot.hrSource.sha256,Contract:snapshot.hrSource.scoringStatus,EditorialVersion:data.audit.hrDetails?.editorialVersion||editorial.version,PhotoEvidenceId:details.finalEvidence?.photoId||'',DocumentEvidenceIds:(details.finalEvidence?.documentIds||[]).filter(Boolean).join(', '),OverallPercentage:data.audit.assessmentStatus==='scored'?data.audit.overallPercentage:'',Observations:details.observations||'',FinalOpinion:details.finalOpinion||''}]),'HR Source');
    }

    if(data.audit.auditType==='service'&&data.audit.templateSnapshot?.serviceSource){
      const snapshot=data.audit.templateSnapshot,assessment=data.audit.serviceAssessment,details=data.audit.serviceDetails||{};
      const answers=new Map((data.audit.checks||[]).map(a=>[a.questionId,a]));
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(snapshot.sections.flatMap(section=>section.questions.map(q=>({Section:section.title,Criterion:q.label,OriginalCriterion:q.sourceText||'',SourceCell:q.sourceCell,SourceNumber:q.sourceNumber||'',Answer:answers.get(q.id)?.answer||'',Score:answers.get(q.id)?.score??'',Note:answers.get(q.id)?.comment||'',EvidenceIds:(details.evidenceLinks||[]).filter(l=>l.questionId===q.id).map(l=>l.evidenceId).join(', ')})))),'Service Criteria');
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(snapshot.sections.map(s=>({Section:s.title,Percentage:assessment?.sections?.find(a=>a.id===s.id)?.percentage??'',Note:details.sectionNotes?.[s.id]||'',PhotoEvidenceId:details.sectionPhotos?.[s.id]||''}))),'Service Sections');
      if(snapshot.serviceReferences?.length)XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(snapshot.serviceReferences.map(r=>({SourceCell:r.sourceCell,OriginalText:r.sourceText,Label:r.label,Note:details.referenceNotes?.[r.id]||'',Scored:false}))),'Service References');
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet([{Brand:snapshot.brandName,Restaurant:data.audit.restaurantId,Revision:String(data.audit.templateRevisionId),SourceSHA256:snapshot.serviceSource.sha256,Contract:snapshot.serviceSource.scoringStatus,AuditDate:data.audit.date,Auditor:data.audit.auditorId,OverallPercentage:data.audit.assessmentStatus==='scored'?data.audit.overallPercentage:'',Observations:details.observations||'',FinalOpinion:details.finalOpinion||'',PhotoEvidenceId:details.finalEvidence?.photoId||'',DocumentEvidenceIds:(details.finalEvidence?.documentIds||[]).filter(Boolean).join(', '),SourceReferenceNotes:JSON.stringify(details.referenceNotes||{})}]),'Service Source');
    }

    if(data.audit.templateSnapshot?.standardSource){
      await require('../services/standardAuditExecution.service').requireSubmitted(data.audit);
      const snapshot=data.audit.templateSnapshot,assessment=data.audit.standardAssessment,details=data.audit.standardDetails||{};
      const restaurant=data.audit.standardRestaurantSnapshot||await require('../models/restaurant.model').findOne({id:data.audit.restaurantId}).select('name location').lean();
      const answers=new Map((data.audit.checks||[]).map(a=>[a.questionId,a]));
      const cover=[{Organization:'GFC',Brand:snapshot.brandName,Restaurant:restaurant?.name||data.audit.restaurantId,RestaurantId:data.audit.restaurantId,Area:restaurant?.location||'',AuditDate:data.audit.date,Auditor:data.audit.standardSubmission?.name||data.audit.standardAuditorSnapshot?.name||data.audit.auditorId,AuditorId:data.audit.standardSubmission?.actorId||data.audit.auditorId,CreatedBy:data.audit.standardAuditorSnapshot?.id||data.audit.auditorId,AuditorSignature:'',RestaurantManagerSignature:'',RestaurantManager:details.restaurantManager||'',ShiftManager:details.shiftManager||'',Status:data.audit.status,CatalogVersion:snapshot.standardSource.version,Revision:String(data.audit.templateRevisionId),SourceSHA256:snapshot.standardSource.sha256,ApprovalStatuses:data.approvals.map(a=>a.status).join(', '),Total:assessment?.total,Applicable:assessment?.applicable,NA:assessment?.na,Unanswered:assessment?.unanswered,Compliant:assessment?.compliant,Critical:assessment?.critical,Major:assessment?.major,Minor:assessment?.minor,SourceCritical:assessment?.sourceRisk?.critical,SourceMajor:assessment?.sourceRisk?.major,SourceMinor:assessment?.sourceRisk?.minor,SourceRiskUnspecified:assessment?.sourceRisk?.unspecified,Percentage:assessment?.percentage??'',CalculationReason:assessment?.reason,Observations:details.observations||'',FinalOpinion:details.finalOpinion||'',FinalPhoto:details.finalEvidence?.photoId||'',Documents:(details.finalEvidence?.documentIds||[]).join(', ')}];
      for(const section of assessment?.sections||[])cover.push({Section:section.title,Category:section.category,Total:section.total,Applicable:section.applicable,NA:section.na,Unanswered:section.unanswered,Compliant:section.compliant,Critical:section.critical,Major:section.major,Minor:section.minor,SourceCritical:section.sourceRisk.critical,SourceMajor:section.sourceRisk.major,SourceMinor:section.sourceRisk.minor,SourceRiskUnspecified:section.sourceRisk.unspecified,Percentage:section.percentage??'',Notes:details.sectionNotes?.[section.id]||'',Photo:details.sectionPhotos?.[section.id]||''});
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(cover),'Cover');
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(snapshot.sections.flatMap(s=>s.questions.map(q=>({Id:q.id,Section:s.title,Category:s.category,CatalogVersion:snapshot.standardSource.version,File:q.sourceFile,Worksheet:q.worksheet,Row:q.sourceRow,Code:q.sourceCode||'',SourceMetadata:JSON.stringify(q.sourceMetadata||{}),SourceText:q.sourceText,Text:q.label,SourceRisk:q.sourceRisk||'',Result:answers.get(q.id)?.answer||'',Note:answers.get(q.id)?.comment||'',NAReason:details.naReasons?.[q.id]||'',Evidence:(details.evidenceLinks||[]).filter(l=>l.questionId===q.id).map(l=>l.evidenceId).join(', '),ObservationCount:(details.criterionObservations||[]).filter(o=>o.standardId===q.id).length})))),'Standards');
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet((details.criterionObservations||[]).map(o=>({Id:o.id,StandardId:o.standardId,Description:o.description,EvidenceIds:o.evidenceIds.join(', ')}))),'Observations');
      const saves=await require('../models/standardAuditSave.model').find({auditId:data.audit._id}).sort({version:1}).lean();
      const history=[];
      for(const v of saves){const base={Version:v.version,Actor:v.actor,At:v.at,Status:v.status};
       history.push({...base,Kind:'audit-details',SubmittedBy:v.submission?.actorId||'',SubmittedAt:v.submission?.at||'',OverallPercentage:v.assessment?.overallPercentage??'',Observations:v.details?.observations||'',FinalOpinion:v.details?.finalOpinion||'',RestaurantManager:v.details?.restaurantManager||'',ShiftManager:v.details?.shiftManager||'',Photo:v.details?.finalEvidence?.photoId||'',Documents:(v.details?.finalEvidence?.documentIds||[]).join(', ')});
       for(const a of v.answers||[])history.push({...base,Kind:'answer',StandardId:a.questionId,Answer:a.answer,Note:a.comment||'',NAReason:v.details?.naReasons?.[a.questionId]||'',EvidenceIds:(v.details?.evidenceLinks||[]).filter(l=>l.questionId===a.questionId).map(l=>l.evidenceId).join(', ')});
       for(const section of snapshot.sections)history.push({...base,Kind:'section-details',Section:section.id,Note:v.details?.sectionNotes?.[section.id]||'',Photo:v.details?.sectionPhotos?.[section.id]||'',Percentage:v.assessment?.standardAssessment?.sections?.find(s=>s.id===section.id)?.percentage??''});
       for(const o of v.details?.criterionObservations||[])history.push({...base,Kind:'criterion-observation',StandardId:o.standardId,ObservationId:o.id,Note:o.description,EvidenceIds:o.evidenceIds.join(', ')});
      }
      XLSX.utils.book_append_sheet(workbook,XLSX.utils.json_to_sheet(history),'History');
    }

    await require('../services/hseAuditExport.service').append(XLSX,workbook,data);
    const buffer = XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx"
      }
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-${req.params.auditId}.xlsx"`
    );

    return res.send(buffer);

  } catch (error) {
    const statusCode = error.statusCode || error.status || 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 400
          ? "Audit ID düzgün deyil."
          : "Audit export zamanı server xətası baş verdi.",
    });
  }
};


exports.exportPdf = async (req, res) => {
  try {
    const data = await buildAuditData(req.params.auditId);

    const doc = new PDFDocument({
      margin: 50
    });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-${req.params.auditId}.pdf"`
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .text("INOP Audit Report", {
        align: "center"
      });

    doc.moveDown();

    doc
      .fontSize(11)
      .text(
        `Audit ID: ${safeValue(data.audit._id)}`
      );

    doc.text(
      `Status: ${safeValue(data.audit.status)}`
    );

    doc.text(
      `Created: ${safeValue(data.audit.createdAt)}`
    );

    doc.moveDown();

    doc
      .fontSize(15)
      .text("Management Summary");

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .text(
        `Findings: ${data.findings.length}`
      );

    doc.text(
      `Approvals: ${data.approvals.length}`
    );

    doc.text(
      `Corrective Actions: ${data.actions.length}`
    );

    doc.text(
      `Closures: ${data.closures.length}`
    );

    doc.moveDown();

    doc
      .fontSize(15)
      .text("Findings");

    doc.moveDown(0.5);

    if (!data.findings.length) {
      doc
        .fontSize(11)
        .text("No findings recorded.");
    } else {
      data.findings.forEach((finding, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${
              safeValue(
                finding.title ||
                finding.name ||
                "Finding"
              )
            }`
          );

        doc.text(
          `Status: ${safeValue(finding.status)}`
        );

        if (finding.priority) {
          doc.text(
            `Priority: ${safeValue(finding.priority)}`
          );
        }

        if (finding.description) {
          doc.text(
            `Description: ${safeValue(
              finding.description
            )}`
          );
        }

        doc.moveDown(0.5);
      });
    }

    doc.addPage();

    doc
      .fontSize(15)
      .text("Approvals");

    doc.moveDown(0.5);

    if (!data.approvals.length) {
      doc
        .fontSize(11)
        .text("No approvals recorded.");
    } else {
      data.approvals.forEach((approval, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. Status: ${
              safeValue(approval.status)
            }`
          );

        if (approval.comment) {
          doc.text(
            `Comment: ${safeValue(
              approval.comment
            )}`
          );
        }

        doc.moveDown(0.5);
      });
    }

    doc.moveDown();

    doc
      .fontSize(15)
      .text("Corrective Actions");

    doc.moveDown(0.5);

    if (!data.actions.length) {
      doc
        .fontSize(11)
        .text("No corrective actions recorded.");
    } else {
      data.actions.forEach((action, index) => {
        doc
          .fontSize(11)
          .text(
            `${index + 1}. ${
              safeValue(
                action.title ||
                action.name ||
                action.description ||
                "Action"
              )
            }`
          );

        doc.text(
          `Status: ${safeValue(action.status)}`
        );

        if (action.deadline) {
          doc.text(
            `Deadline: ${safeValue(action.deadline)}`
          );
        }

        doc.moveDown(0.5);
      });
    }

    doc.moveDown();

    doc
      .fontSize(15)
      .text("Closure");

    doc.moveDown(0.5);

    if (!data.closures.length) {
      doc
        .fontSize(11)
        .text("Audit has not been closed.");
    } else {
      const closure =
        data.closures[
          data.closures.length - 1
        ];

      doc
        .fontSize(11)
        .text(
          `Final Status: ${safeValue(
            closure.finalStatus
          )}`
        );

      doc.text(
        `Approval Status: ${safeValue(
          closure.approvalStatus
        )}`
      );

      doc.text(
        `Closed At: ${safeValue(
          closure.closedAt
        )}`
      );

      if (closure.comment) {
        doc.text(
          `Comment: ${safeValue(
            closure.comment
          )}`
        );
      }
    }

    doc.end();

  } catch (error) {
    if (!res.headersSent) {
      const statusCode = error.statusCode || error.status || 500;

      return res.status(statusCode).json({
        success: false,
        message:
          statusCode === 400
            ? "Audit ID düzgün deyil."
            : "Audit PDF export zamanı server xətası baş verdi.",
      });
    }

    res.end();
  }
};
