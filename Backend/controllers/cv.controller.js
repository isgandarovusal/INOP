const {
  extractCvTextFromBuffer,
} = require("../services/cvParser.service");

const {
  parseStructuredCv,
} = require("../services/cvStructuredParser.service");

exports.parseCv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CV faylı tələb olunur.",
      });
    }

    const text = await extractCvTextFromBuffer(
      req.file.buffer,
      req.file.originalname
    );

    if (!text) {
      return res.status(422).json({
        message: "CV faylından oxuna bilən mətn tapılmadı.",
      });
    }

    const parsed = parseStructuredCv(text);

    return res.status(200).json({
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      ...parsed,
    });
  } catch (error) {
    console.error("Parse CV error:", error);

    return res.status(422).json({
      message:
        error.message ||
        "CV emal edilərkən xəta baş verdi.",
    });
  }
};
