const fs = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

const MAX_EXTRACTED_TEXT_LENGTH = 100_000;

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeExtractedText(result?.text);
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeExtractedText(result?.value);
}

async function extractCvTextFromBuffer(buffer, filename) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("CV faylı düzgün buffer formatında deyil.");
  }

  const extension = path.extname(filename || "").toLowerCase();

  if (extension === ".pdf") {
    return extractPdfText(buffer);
  }

  if (extension === ".docx") {
    return extractDocxText(buffer);
  }

  throw new Error(
    "Dəstəklənməyən CV formatıdır. Yalnız PDF və DOCX qəbul olunur."
  );
}

async function extractCvTextFromFile(filePath, filename) {
  const buffer = await fs.readFile(filePath);

  return extractCvTextFromBuffer(
    buffer,
    filename || path.basename(filePath)
  );
}

module.exports = {
  extractCvTextFromBuffer,
  extractCvTextFromFile,
};
