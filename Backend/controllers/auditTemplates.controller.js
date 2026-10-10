const mongoose = require("mongoose");
const AuditTemplate = require("../models/auditTemplate.model");
const AuditSourceDocument = require("../models/auditSourceDocument.model");
const AuditExecution = require("../models/auditExecution.model");
const { recordActivity } = require("../services/activityLog.service");
const {
  requireScope, readScope, queryText, enumValue, objectId,
  requestError, errorResponse,
} = require("../services/auditLibrary.service");
const { templateInput, checklistQuestions } = require("../services/auditTemplateValidation.service");
const { listRecords } = require("../utils/listQuery");

function normalizeTemplate(doc) {
  const item = doc.toObject ? doc.toObject() : doc;
  return { ...item, id: String(item._id), _id: undefined };
}

async function log(req, action, template) {
  try {
    await recordActivity({ req, action, entityType: "audit_template", entityId: template._id,
      description: `Audit template ${action}: ${template.name} (${template.auditType})` });
  } catch (error) { console.error("Audit template activity error:", error?.name || "Error"); }
}

async function validateSources(req, input, templateId) {
  if (!input.sourceDocumentIds.length) return;
  const objectIds = input.sourceDocumentIds.filter(id => mongoose.isObjectIdOrHexString(id));
  const sources = await AuditSourceDocument.find({ $and: [await readScope(req, "audit.source_document"),
    { $or: [{ _id: { $in: objectIds } }, { id: { $in: input.sourceDocumentIds } }] }],
  }).select("_id id auditType organizationId brandId templateId").lean();
  const lookup = new Map();
  for (const source of sources) {
    lookup.set(String(source._id), source);
    if (source.id) lookup.set(source.id, source);
  }
  for (const id of input.sourceDocumentIds) {
    const source = lookup.get(id);
    if (!source) throw requestError("Source document not found or not accessible.", 404);
    if (source.auditType !== input.auditType || source.organizationId !== input.organizationId ||
        source.brandId !== input.brandId || source.templateId && source.templateId !== templateId) {
      throw requestError("Source document metadata does not match the template.");
    }
  }
  input.sourceDocumentIds = [...new Set(input.sourceDocumentIds.map(id => String(lookup.get(id)._id)))];
}

exports.getTemplates = async (req, res) => {
  try {
    const filter = {};
    for (const field of ["brandId", "organizationId", "auditType", "status"]) queryText(req, filter, field);
    if (filter.auditType) enumValue(filter.auditType, "auditType", ["service", "standard", "occupational-safety"]);
    if (filter.status) enumValue(filter.status, "status", ["draft", "active", "archived"]);
    const templates = await listRecords(AuditTemplate,
      { $and: [requireScope(req, "audit.template"), filter] }, req, res, { sort: { updatedAt: -1, _id: -1 } });
    return res.json(templates.map(normalizeTemplate));
  } catch (error) { return errorResponse(res, error, "Audit templates could not be loaded."); }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await AuditTemplate.findOne({ $and: [{ _id: objectId(req.params.id) }, requireScope(req, "audit.template")] });
    if (!template) throw requestError("Audit template not found.", 404);
    return res.json(normalizeTemplate(template));
  } catch (error) { return errorResponse(res, error, "Audit template could not be loaded."); }
};

exports.getTemplateChecklist = async (req, res) => {
  try {
    const template = await AuditTemplate.findOne({ $and: [{ _id: objectId(req.params.id) }, requireScope(req, "audit.template")] }).lean();
    if (!template) throw requestError("Audit template not found.", 404);
    return res.json({ templateId: String(template._id), version: template.version, sections: template.sections,
      questions: checklistQuestions(template.sections) });
  } catch (error) { return errorResponse(res, error, "Audit checklist could not be loaded."); }
};

exports.createTemplate = async (req, res) => {
  try {
    requireScope(req, "audit.template");
    const input = templateInput(req.body);
    await validateSources(req, input);
    const template = await AuditTemplate.create({ ...input, createdBy: req.user.id, updatedBy: req.user.id,
      assignedTo: req.user.id, departmentId: req.user.departmentId || "" });
    await log(req, "create", template);
    return res.status(201).json(normalizeTemplate(template));
  } catch (error) { return errorResponse(res, error, "Audit template could not be created."); }
};

exports.updateTemplate = async (req, res) => {
  try {
    const template = await AuditTemplate.findOne({ $and: [{ _id: objectId(req.params.id) }, requireScope(req, "audit.template")] });
    if (!template) throw requestError("Audit template not found.", 404);
    if (template.status === "archived") throw requestError("An archived template cannot be changed or reactivated. Create a new template version.", 409);
    const input = templateInput(req.body, template.toObject());
    await validateSources(req, input, String(template._id));
    if (await AuditExecution.exists({ checklistId: template._id })) {
      const before = templateInput({}, template.toObject());
      for (const field of ["auditType", "sections", "version", "sourceDocumentIds", "organizationId", "brandId"]) {
        if (JSON.stringify(input[field]) !== JSON.stringify(before[field])) {
          throw requestError("An executed checklist cannot be changed. Create a new template version.", 409);
        }
      }
    }
    Object.assign(template, input, { updatedBy: req.user.id });
    await template.save();
    await log(req, "update", template);
    return res.json(normalizeTemplate(template));
  } catch (error) { return errorResponse(res, error, "Audit template could not be updated."); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const scope = requireScope(req, "audit.template");
    const id = objectId(req.params.id);
    const template = await AuditTemplate.findOne({ $and: [scope, { _id: id }] });
    if (!template) throw requestError("Audit template not found.", 404);
    // Retain the identifier and source links even for apparently unused
    // templates: primary audits can reference them independently of executions.
    // The shared library mutation lease serializes this with execution creation.
    if (template.status !== "archived") {
      template.status = "archived";
      template.updatedBy = req.user.id;
      await template.save();
      await log(req, "archive", template);
    }
    return res.json({ message: "Audit template archived.", id, status: "archived" });
  } catch (error) { return errorResponse(res, error, "Audit template could not be deleted."); }
};
