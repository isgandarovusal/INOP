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

  const ext = path.extname(filename || "").toLowerCase();
  if (ext === ".pdf" && buffer.subarray(0,5).toString() !== "%PDF-") throw new Error("Invalid PDF signature");
  if (ext === ".docx" && !buffer.subarray(0,4).equals(Buffer.from([80,75,3,4]))) throw new Error("Invalid DOCX signature");
  if (!require("worker_threads").isMainThread)
    return extractLocal(buffer, filename);
  if (buffer.length > 5 * 1024 * 1024) throw new Error("CV exceeds size limit");
  const { Worker } = require("worker_threads");
  return new Promise((resolve, reject) => {
    const worker = new Worker(require("path").join(__dirname, "cvWorker.js"), {
      workerData: { buffer, filename },
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("CV parsing timed out"));
    }, 15000);
    worker.once("message", (m) => {
      clearTimeout(timer);
      worker.terminate();
      m.error ? reject(new Error(m.error)) : resolve(m.text);
    });
    worker.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error("CV parser stopped"));
    });
  });
}
async function extractLocal(buffer, filename) {
  const extension = path.extname(filename || "").toLowerCase();

  if (extension === ".pdf") {
    return extractPdfText(buffer);
  }

  if (extension === ".docx") {
    return extractDocxText(buffer);
  }

  throw new Error(
    "Dəstəklənməyən CV formatıdır. Yalnız PDF və DOCX qəbul olunur.",
  );
}

async function extractCvTextFromFile(filePath, filename) {
  const buffer = await fs.readFile(filePath);

  return extractCvTextFromBuffer(buffer, filename || path.basename(filePath));
}

module.exports = {
  extractCvTextFromBuffer,
  extractCvTextFromFile,
};
