const Audit = require("../models/audit.model");
const { findAuditByIdentifier, userHasAuditAccess } = require("../middleware/auditScope.middleware");
const { recordActivity } = require("../services/activityLog.service");
const { cleanupUploadedFile } = require("../services/fileStorage.service");
const { requestError, errorResponse } = require("../services/auditLibrary.service");

exports.uploadAuditAttachment = async (req, res) => {
  try {
    if (!req.file) throw requestError("A file is required.");
    const audit = await findAuditByIdentifier(req.params.id);
    if (!audit || !await userHasAuditAccess(req, String(audit._id))) throw requestError("Audit not found.", 404);
    const kind = req.body?.kind || "attachment";
    if (!["photo", "attachment"].includes(kind)) throw requestError("kind must be photo or attachment.");
    if (kind === "photo" && !req.file.mimetype.startsWith("image/")) throw requestError("Photos must be PNG or JPEG images.");
    const field = kind === "photo" ? "photos" : "attachments";
    const file = {
      name: req.file.originalname, size: req.file.size, fileName: req.file.filename,
      mimeType: req.file.mimetype, url: `/uploads/${req.file.filename}`, blobUrl: `/uploads/${req.file.filename}`,
    };
    const updated = await Audit.findOneAndUpdate({ _id: audit._id,
      status: { $nin: ["completed", "approved", "archived", "cancelled"] },
      [`${field}.99`]: { $exists: false },
    }, { $push: { [field]: file } }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw requestError("This audit is closed or already has 100 files of this kind.", 409);
    try {
      await recordActivity({ req, action: "update", entityType: "audit", entityId: audit._id,
        description: `Audit ${kind} uploaded: ${req.file.originalname}` });
    } catch (error) { console.error("Audit attachment activity error:", error?.name || "Error"); }
    return res.status(201).json(file);
  } catch (error) {
    try { await cleanupUploadedFile(req.file); } catch (cleanupError) { console.error("Upload cleanup failed:", cleanupError?.name || "Error"); }
    return errorResponse(res, error, "Audit attachment could not be saved.");
  }
};
