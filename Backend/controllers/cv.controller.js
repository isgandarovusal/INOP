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

    const { text, parsed } = await parseCvResultFromBuffer(
      req.file.buffer,
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
