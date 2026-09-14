const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");

const Candidate = require("../models/candidate.model");
const Application = require("../models/application.model");

function csvEscape(value) {
  const text = Array.isArray(value)
    ? value.join(", ")
    : String(value ?? "");

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function parseDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function buildCandidateFilter(req) {
  const filter = { ...(req.dataScope || {}) };
  const { status, role, q, from, to } = req.query;

  if (status) {
    filter.status = String(status).trim().toLowerCase();
  }

  if (role) {
    filter.role = {
      $regex: String(role).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  if (q) {
    const escaped = String(q)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { role: { $regex: escaped, $options: "i" } },
      { skills: { $regex: escaped, $options: "i" } },
    ];
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  return filter;
}

function candidateRow(candidate) {
  return {
    ID: String(candidate._id || ""),
    Name: candidate.name || "",
    Email: candidate.email || "",
    Phone: candidate.phone || "",
    Role: candidate.role || "",
    Status: candidate.status || "",
    ExperienceYears: candidate.experience ?? 0,
    Skills: Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "",
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

async function getFilteredCandidates(req) {
  return Candidate.find(buildCandidateFilter(req))
    .sort({ createdAt: -1 })
    .lean();
}

exports.exportCandidatesCsv = async (req, res) => {
  try {
    const candidates = await getFilteredCandidates(req);
    const rows = candidates.map(candidateRow);
    const headers = Object.keys(
      rows[0] || candidateRow({ _id: "" })
    );

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => csvEscape(row[header])).join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="candidates.csv"'
    );

    return res.send("\ufeff" + csv);
  } catch (error) {
    console.error("Candidate CSV export error:", error);
    return res.status(500).json({
      success: false,
      message: "Candidate CSV export zamanı server xətası baş verdi.",
    });
  }
};

exports.exportCandidatesExcel = async (req, res) => {
  try {
    const candidates = await getFilteredCandidates(req);
    const rows = candidates.map(candidateRow);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      rows.length ? rows : [{ Message: "No candidates found" }]
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates");

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
      success: false,
      message: "Candidate Excel export zamanı server xətası baş verdi.",
    });
  }
};

exports.exportCandidatePdf = async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID düzgün deyil.",
      });
    }

    const candidate = await Candidate.findOne({
      _id: candidateId,
      ...(req.dataScope || {}),
    }).lean();

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate tapılmadı və ya giriş icazəniz yoxdur.",
      });
    }

    const applications = await Application.find({ candidateId })
      .populate("jobId", "title department location type")
      .sort({ createdAt: -1 })
      .lean();

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="candidate-${candidateId}.pdf"`
    );

    doc.pipe(res);
    doc.fontSize(20).text("INOP Candidate Report", { align: "center" });
    doc.moveDown();

    const line = (label, value) => {
      doc.fontSize(11).text(`${label}: ${value || "-"}`);
    };

    line("Name", candidate.name);
    line("Role", candidate.role);
    line("Status", candidate.status);
    line("Email", candidate.email);
    line("Phone", candidate.phone);
    line("Experience", `${candidate.experience || 0} years`);
    line("Education", candidate.education);
    line("Skills", (candidate.skills || []).join(", "));
    line("Languages", (candidate.languages || []).join(", "));
    line("Certificates", (candidate.certificates || []).join(", "));
    line("CV", candidate.cvUrl);

    doc.moveDown();
    doc.fontSize(15).text("Applications");
    doc.moveDown(0.5);

    if (!applications.length) {
      doc.fontSize(11).text("No applications found.");
    } else {
      applications.forEach((application, index) => {
        const jobTitle = application.jobId?.title || "Unknown job";
        doc
          .fontSize(11)
          .text(`${index + 1}. ${jobTitle}`)
          .text(`Status: ${application.status}`)
          .text(`Match score: ${application.score || 0}%`)
          .moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error("Candidate PDF export error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Candidate PDF export zamanı server xətası baş verdi.",
      });
    }
  }
};

module.exports.buildCandidateFilter = buildCandidateFilter;
