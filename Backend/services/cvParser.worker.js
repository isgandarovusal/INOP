const { parentPort } = require("node:worker_threads");
const path = require("node:path");
const { validateFileContent } = require("./fileStorage.service");

const MAX_EXTRACTED_TEXT_LENGTH = 100_000;

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

parentPort.on("message", async ({ data, filename }) => {
  try {
    const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    // ZIP validation decompresses content too. Apply the worker's deadline and
    // memory restrictions to it instead of blocking the request event loop.
    validateFileContent(buffer, filename);
    let text;
    if (path.extname(filename).toLowerCase() === ".pdf") {
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        text = (await parser.getText())?.text;
      } finally {
        await parser.destroy();
      }
    } else {
      const mammoth = require("mammoth");
      text = (await mammoth.extractRawText({ buffer }))?.value;
    }
    parentPort.postMessage({ text: normalizeExtractedText(text) });
  } catch (error) {
    parentPort.postMessage({ error: {
      message: error.message || "CV emal edilərkən xəta baş verdi.",
      status: error.status === 400 ? 400 : 422,
      code: error.code === "INVALID_FILE" ? "INVALID_FILE" : "CV_PARSE_FAILED",
    } });
  }
});
