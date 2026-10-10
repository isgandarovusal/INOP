const mongoose = require("mongoose");
const { getUserPermissionScope } = require("../middleware/authorization.middleware");

function requestError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function scopeFilter(req, resource, explicitScope) {
  const scope = explicitScope || req.permission?.scope;
  if (!req.user?.id || !scope) return null;
  if (scope === "all") return {};
  if (scope === "department") return req.user.departmentId ? { departmentId: req.user.departmentId } : null;
  if (scope === "assigned") return { assignedTo: req.user.id };
  if (scope === "own") return { [resource === "audit.source_document" ? "uploadedBy" : "createdBy"]: req.user.id };
  return null;
}

function requireScope(req, resource) {
  const filter = scopeFilter(req, resource);
  if (filter === null) throw requestError("Access denied.", 403);
  return filter;
}

async function readScope(req, resource) {
  const scope = await getUserPermissionScope(req.user.role, resource, "read");
  const filter = scopeFilter(req, resource, scope);
  if (!scope || filter === null) throw requestError("Access denied.", 403);
  return filter;
}

function text(value, field, { required = false, max = 250 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw requestError(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string" || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) {
    throw requestError(`${field} must be a string of at most ${max} characters.`);
  }
  const result = value.trim();
  if (required && !result) throw requestError(`${field} is required.`);
  return result;
}

function queryText(req, filter, field, options) {
  if (req.query[field] !== undefined) filter[field] = text(req.query[field], field, { required: true, ...options });
}

function enumValue(value, field, choices) {
  if (!choices.includes(value)) throw requestError(`${field} must be one of ${choices.join(", ")}.`);
  return value;
}

function identifierFilter(id) {
  const identifier = text(id, "id", { required: true, max: 150 });
  return mongoose.isObjectIdOrHexString(identifier)
    ? { $or: [{ _id: identifier }, { id: identifier }] }
    : { id: identifier };
}

function objectId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw requestError("Invalid audit template id.");
  return id;
}

function errorResponse(res, error, fallback) {
  const status = error.status || (["ValidationError", "CastError"].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
  if (status >= 500) console.error(fallback, error?.name || "Error");
  return res.status(status).json({ message: status >= 500 ? fallback : error.message });
}

module.exports = { requestError, scopeFilter, requireScope, readScope, text, queryText, enumValue, identifierFilter, objectId, errorResponse };
