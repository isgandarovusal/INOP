const { text, enumValue, requestError } = require("./auditLibrary.service");
const AUDIT_TYPES = ["service", "standard", "occupational-safety"];
const ANSWER_TYPES = ["yes-no-na", "severity", "score", "text"];

function number(value, field, max = 1000000) {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw requestError(`${field} must be a nonnegative integer up to ${max}.`);
  return value;
}

function validateSections(sections) {
  if (!Array.isArray(sections) || sections.length > 100) throw requestError("sections must contain at most 100 sections.");
  const ids = new Set();
  let questions = 0;
  const node = (value, labelField) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw requestError("Invalid checklist item.");
    const id = text(value.id, "id", { required: true, max: 150 });
    if (ids.has(id)) throw requestError("Checklist ids must be unique.");
    ids.add(id);
    const result = { id, [labelField]: text(value[labelField], labelField, { required: true, max: 2000 }) };
    if (value.order !== undefined) result.order = number(value.order, "order");
    if (value.active !== undefined) {
      if (typeof value.active !== "boolean") throw requestError("active must be a boolean.");
      result.active = value.active;
    }
    return result;
  };
  const questionList = (items = []) => {
    if (!Array.isArray(items) || items.length > 500 || (questions += items.length) > 2000) {
      throw requestError("A checklist can contain at most 2000 questions.");
    }
    return items.map(value => {
      const result = node(value, "label");
      if (value.answerType !== undefined) result.answerType = enumValue(value.answerType, "answerType", ANSWER_TYPES);
      if (value.required !== undefined) {
        if (typeof value.required !== "boolean") throw requestError("required must be a boolean.");
        result.required = value.required;
      }
      return result;
    });
  };
  return sections.map(value => {
    const result = node(value, "title");
    const subsections = value.subsections === undefined ? [] : value.subsections;
    if (!Array.isArray(subsections) || subsections.length > 100) throw requestError("A section can contain at most 100 subsections.");
    result.questions = questionList(value.questions);
    result.subsections = subsections.map(subsection => ({ ...node(subsection, "title"), questions: questionList(subsection.questions) }));
    return result;
  });
}

function checklistQuestions(sections) {
  const questions = [];
  for (const section of sections || []) {
    if (section.active === false) continue;
    for (const question of section.questions || []) {
      if (question.active !== false) questions.push(question.toObject ? question.toObject() : question);
    }
    for (const subsection of section.subsections || []) {
      if (subsection.active === false) continue;
      for (const question of subsection.questions || []) {
        if (question.active !== false) questions.push(question.toObject ? question.toObject() : question);
      }
    }
  }
  return questions;
}

function templateInput(body, existing = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw requestError("Invalid template body.");
  const combined = { ...existing, ...body };
  const result = {};
  for (const field of ["organizationId", "brandId", "brandName", "name", "version"]) {
    result[field] = text(combined[field] === undefined && field === "version" ? "1.0" : combined[field], field,
      { required: ["brandName", "name", "version"].includes(field), max: field === "version" ? 40 : 250 });
  }
  result.auditType = enumValue(combined.auditType, "auditType", AUDIT_TYPES);
  result.status = enumValue(combined.status === undefined ? "draft" : combined.status, "status", ["draft", "active", "archived"]);
  result.visitCount = number(combined.visitCount === undefined ? 0 : combined.visitCount, "visitCount");
  result.sections = validateSections(combined.sections === undefined ? [] : combined.sections);
  if (result.status === "active" && !checklistQuestions(result.sections).length) throw requestError("An active template requires at least one active question.");
  const refs = combined.sourceDocumentIds === undefined ? [] : combined.sourceDocumentIds;
  if (!Array.isArray(refs) || refs.length > 100) throw requestError("sourceDocumentIds must contain at most 100 ids.");
  result.sourceDocumentIds = [...new Set(refs.map(value => text(value, "sourceDocumentId", { required: true, max: 150 })))];
  return result;
}

module.exports = { templateInput, validateSections, checklistQuestions };
