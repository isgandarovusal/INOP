const crypto = require("node:crypto");
const mongoose = require("mongoose");
const AuditSourceDocument = require("../models/auditSourceDocument.model");
const AuditTemplate = require("../models/auditTemplate.model");
const AuditExecution = require("../models/auditExecution.model");
const { recordActivity } = require("../services/activityLog.service");
const { cleanupUploadedFile, removeStoredFile, isSafeFilename } = require("../services/fileStorage.service");
const {
  requireScope, readScope, text, queryText, enumValue, identifierFilter,
  objectId, requestError, errorResponse,
} = require("../services/auditLibrary.service");
const { listRecords } = require("../utils/listQuery");
const AUDIT_TYPES = ["service", "standard", "occupational-safety"];

function normalizeDocument(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  return {
    ...item, id: String(item._id || item.id), _id: undefined,
    filePath: `/uploads/${item.fileName}`,
    url: `/uploads/${item.fileName}`,
  };
}

async function log(req, action, document) {
  try {
    await recordActivity({ req, action, entityType: "audit_source_document", entityId: document._id,
      description: `Audit source document ${action}: ${document.originalName}` });
  } catch (error) { console.error("Audit source activity error:", error?.name || "Error"); }
}

exports.getDocuments = async (req, res) => {
  try {
    const filter = {};
    for (const field of ["templateId", "brandId", "organizationId", "auditType"]) queryText(req, filter, field);
    if (filter.auditType) enumValue(filter.auditType, "auditType", AUDIT_TYPES);
    const documents = await listRecords(AuditSourceDocument,
      { $and: [requireScope(req, "audit.source_document"), filter] }, req, res);
    return res.json(documents.map(normalizeDocument));
  } catch (error) { return errorResponse(res, error, "Audit documents could not be loaded."); }
};

exports.uploadDocument = async (req, res) => {
  try {
    requireScope(req, "audit.source_document");
    if (!req.file) throw requestError("A file is required.");
    const body = req.body || {};
    const templateId = text(body.templateId, "templateId", { max: 150 });
    let organizationId = text(body.organizationId, "organizationId");
    let brandId = text(body.brandId, "brandId");
    let auditType = body.auditType === undefined ? "service" : enumValue(body.auditType, "auditType", AUDIT_TYPES);
    if (templateId) {
      const template = await AuditTemplate.findOne({ $and: [{ _id: objectId(templateId) }, await readScope(req, "audit.template")] }).lean();
      if (!template) throw requestError("Audit template not found.", 404);
      if (organizationId && organizationId !== template.organizationId || brandId && brandId !== template.brandId ||
          body.auditType && body.auditType !== template.auditType) throw requestError("Document metadata must match its template.");
      organizationId = template.organizationId;
      brandId = template.brandId;
      auditType = template.auditType;
    }
    const document = await AuditSourceDocument.create({
      id: `source-${crypto.randomUUID()}`, templateId, organizationId, brandId, auditType,
      fileName: req.file.filename, name: req.file.originalname, originalName: req.file.originalname,
      mimeType: req.file.mimetype, size: req.file.size,
      storageKey: `uploads/${req.file.filename}`, filePath: `uploads/${req.file.filename}`, status: "uploaded",
      uploadedBy: req.user.id, assignedTo: req.user.id, departmentId: req.user.departmentId || "",
    });
    await log(req, "create", document);
    return res.status(201).json(normalizeDocument(document));
  } catch (error) {
    try { await cleanupUploadedFile(req.file); } catch (cleanupError) { console.error("Upload cleanup failed:", cleanupError?.name || "Error"); }
    return errorResponse(res, error, "Audit document could not be saved.");
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const scope = requireScope(req, "audit.source_document");
    const filter = { $and: [scope, identifierFilter(req.params.id)] };
    const document = await AuditSourceDocument.findOne(filter).lean();
    if (!document) throw requestError("Audit document not found.", 404);
    const identifiers = [String(document._id), document.id].filter(Boolean);
    const references = [{ sourceDocumentIds: { $in: identifiers } }];
    if (mongoose.isObjectIdOrHexString(document.templateId)) references.push({ _id: document.templateId });
    const templates = await AuditTemplate.find({ $or: references }).select("_id").lean();
    if (templates.length && await AuditExecution.exists({ checklistId: { $in: templates.map(template => template._id) } })) {
      throw requestError("This source document belongs to an executed checklist and must be retained.", 409);
    }
    // Remove both current ObjectId and historical source-* references.
    await AuditTemplate.updateMany({ sourceDocumentIds: { $in: identifiers } },
      { $pull: { sourceDocumentIds: { $in: identifiers } } });
    const deleted = await AuditSourceDocument.findOneAndDelete({ $and: [scope, { _id: document._id }] });
    if (!deleted) throw requestError("Audit document not found.", 404);
    if (document.fileName && isSafeFilename(document.fileName)) await removeStoredFile(document.fileName);
    await log(req, "delete", document);
    return res.json({ success: true, id: req.params.id });
  } catch (error) { return errorResponse(res, error, "Audit document could not be deleted."); }
};
