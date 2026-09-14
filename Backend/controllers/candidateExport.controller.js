const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");

const Candidate = require("../models/candidate.model");
const Application = require("../models/application.model");

function candidateRow(candidate) {
  return {
    ID: String(candidate._id || ""),
    Name: candidate.name || "",
    Email: candidate.email || "",
    Phone: candidate.phone || "",
    Role: candidate.role || "",
    Status: candidate.status || "",
    ExperienceYears: candidate.experience ?? 0,
    Skills: Array.isArray(candidate.skills)
      ? candidate.skills.join(", ")
      : "",
    Languages: Array.isArray(candidate.languages)
      ? candidate.languages.join(", ")
      : "",
    Certificates: Array.isArray(candidate.certificates)
      ? candidate.certificates.join(", ")
      : "",
    Education: candidate.education || "",
    CV: candidate.cvUrl || "",
    CreatedAt: candidate.createdAt || "",
  };
}

function getScopeFilter(req) {
  return req.dataScope || {};
}

exports.exportCandidatesExcel = async (req, res) => {
  try {
    const candidates = await Candidate.find(getScopeFilter(req))
      .sort({ createdAt: -1 })
      .lean();

    const rows = candidates.map(candidateRow);

    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet(
      rows.length ? rows : [{ Message: "No candidates found" }]
    );

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Candidates"
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="candidates.xlsx"'
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Candidate Excel export error:", error);

    return res.status(500).json({
      message:
        "Namizədlərin Excel exportu zamanı server xətası baş verdi.",
    });
  }
};

exports.exportCandidatePdf = async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({
        message: "Namizəd ID-si düzgün deyil.",
      });
    }

    const candidate = await Candidate.findOne({
      _id: candidateId,
      ...getScopeFilter(req),
    }).lean();

    if (!candidate) {
      return res.status(404).json({
        message:
          "Namizəd tapılmadı və ya giriş icazəniz yoxdur.",
      });
    }

    const applications = await Application.find({
      candidateId: candidate._id,
      ...getScopeFilter(req),
    })
      .populate(
        "jobId",
        "title department location type"
      )
      .sort({ createdAt: -1 })
      .lean();

    const doc = new PDFDocument({
      margin: 50,
    });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="candidate-${candidateId}.pdf"`
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .text("INOP Candidate Report", {
        align: "center",
      });

    doc.moveDown();

    const line = (label, value) => {
      doc
        .fontSize(11)
        .text(`${label}: ${value || "-"}`);
    };

    line("Name", candidate.name);
    line("Role", candidate.role);
    line("Status", candidate.status);
    line("Email", candidate.email);
    line("Phone", candidate.phone);
    line(
      "Experience",
      `${candidate.experience ?? 0} years`
    );
    line("Education", candidate.education);
    line(
      "Skills",
      Array.isArray(candidate.skills)
        ? candidate.skills.join(", ")
        : ""
    );
    line(
      "Languages",
      Array.isArray(candidate.languages)
        ? candidate.languages.join(", ")
        : ""
    );
    line(
      "Certificates",
      Array.isArray(candidate.certificates)
        ? candidate.certificates.join(", ")
        : ""
    );
    line("CV", candidate.cvUrl);

    doc.moveDown();
    doc.fontSize(15).text("Applications");
    doc.moveDown(0.5);

    if (!applications.length) {
      doc
        .fontSize(11)
        .text("No applications found.");
    } else {
      applications.forEach(
        (application, index) => {
          const jobTitle =
            application.jobId?.title ||
            "Unknown job";

          doc
            .fontSize(11)
            .text(`${index + 1}. ${jobTitle}`)
            .text(
              `Status: ${application.status}`
            )
            .text(
              `Match score: ${
                application.score ?? 0
              }%`
            )
            .moveDown(0.5);
        }
      );
    }

    doc.end();
  } catch (error) {
    console.error(
      "Candidate PDF export error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        message:
          "Namizəd PDF exportu zamanı server xətası baş verdi.",
      });
    }
  }
};
