const crypto = require('node:crypto');
const {
  parseCvResultFromBuffer,
} = require("../services/cvParser.service");



exports.parseCv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CV faylı tələb olunur.",
      });
    }

    // Multipart/type/size validation precedes this controller; no original is
    // persisted by the legacy preview. Never extract unscanned document text.
    const bytes = Buffer.from(req.file.buffer);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    let scan;
    try {
      const scanner = require('../services/hrCvIntakeProfiles.service').scanner();
      scan = await scanner.scan(Buffer.from(bytes), { sha256, mimeType: req.file.mimetype });
    } catch {
      return res.status(503).json({ message: 'CV scanning is unavailable. Retry later.', code: 'INTAKE_SCAN_REQUIRED', processingStatus: 'failed' });
    }
    if (scan?.verdict === 'infected') return res.status(422).json({ message: 'CV scanning rejected this document.', code: 'INTAKE_QUARANTINED', processingStatus: 'failed' });
    if (scan?.verdict !== 'clean' || scan.sha256 !== sha256 || !/^[a-zA-Z0-9_.-]{1,64}$/.test(scan.engine || '') || !/^[a-zA-Z0-9_.-]{1,64}$/.test(scan.version || '')) {
      return res.status(503).json({ message: 'CV scanning is unavailable. Retry later.', code: 'INTAKE_SCAN_REQUIRED', processingStatus: 'failed' });
    }
    const { text, parsed } = await parseCvResultFromBuffer(
      bytes,
      req.file.originalname
    );

    if (!text) {
      return res.status(422).json({
        message: "CV faylından oxuna bilən mətn tapılmadı.",
        code: 'OCR_REQUIRED', processingStatus: 'unsupported_ocr',
      });
    }


    return res.status(200).json({
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      ...parsed,
    });
  } catch (error) {
    if (['DOCUMENT_BUSY', 'DOCUMENT_TIMEOUT'].includes(error?.code)) return res.status(503).json({ message: 'CV processing is busy. Retry later.', code: error.code, processingStatus: 'failed' });
    console.error("Parse CV failed:", error?.name || "ExtractionError");

    return res.status(422).json({
      message: "CV emal edilərkən xəta baş verdi.",
      code: 'EXTRACTION_FAILED', processingStatus: 'failed',
    });
  }
};
