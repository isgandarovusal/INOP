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
  const audit = await Audit.findById(auditId)
    .populate("createdBy")
    .populate("auditor")
    .populate("restaurant");

  if (!audit) {
    const error = new Error("Audit not found");
    error.statusCode = 404;
    throw error;
  }

  const findings = await AuditFinding.find({ auditId })
    .sort({ createdAt: 1 })
    .lean();

  const approvals = await AuditApproval.find({ auditId })
    .populate("requestedBy")
    .populate("reviewer")
    .sort({ createdAt: 1 })
    .lean();

  const closures = await AuditClosure.find({ auditId })
    .populate("closedBy")
    .sort({ createdAt: 1 })
    .lean();

  const AuditAction = getOptionalModel("AuditAction");

  let actions = [];

  if (AuditAction) {
    actions = await AuditAction.find({ auditId })
      .populate("responsibleUser")
      .populate("assignedTo")
      .sort({ createdAt: 1 })
      .lean();
  }

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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
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
      Priority: safeValue(finding.priority),
      CreatedAt: safeValue(finding.createdAt)
    }));

    const approvalRows = data.approvals.map((approval) => ({
      ID: safeValue(approval._id),
      Status: safeValue(approval.status),
      Comment: safeValue(approval.comment),
      RequestedBy: safeValue(approval.requestedBy),
      Reviewer: safeValue(approval.reviewer),
      CreatedAt: safeValue(approval.createdAt),
      ApprovedAt: safeValue(approval.approvedAt)
    }));

    const actionRows = data.actions.map((action) => ({
      ID: safeValue(action._id),
      Title: safeValue(
        action.title ||
        action.name ||
        action.description
      ),
      Status: safeValue(action.status),
      Deadline: safeValue(action.deadline),
      ResponsibleUser: safeValue(
        action.responsibleUser ||
        action.assignedTo ||
        action.responsible
      ),
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
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
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
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message: error.message
      });
    }

    res.end();
  }
};
