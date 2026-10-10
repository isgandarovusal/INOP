const error = (code, message, status = 400) => Object.assign(new Error(message), { code, status });
const protectedCriterion = /(?<![\p{L}\p{N}_])(?:age|gender|nationality|ethnicity|religion|pregnant|male|female|race|under\s*\d+|over\s*\d+|milliyyət|cins|yaş|kişilər|qadınlar|национальность|пол|возраст|религия|мужчина|женщина)(?![\p{L}\p{N}_])/iu;
const text = (value, max) => typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>\p{Cf}]/u.test(value);
function keys(value, allowed) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key)); }
exports.jobContext = value => {
  const fields = ['title', 'description', 'brandName', 'workplace', 'experienceYears', 'requiredSkills', 'preferredSkills'];
  if (!keys(value, fields) || !text(value.title, 200) || !value.title.trim() || !text(value.description, 8000)) throw error('AI_INVALID_CONTEXT', 'A bounded vacancy title and description are required.');
  const result = { title: value.title.trim(), description: value.description };
  for (const key of ['brandName', 'workplace']) { if (value[key] !== undefined && !text(value[key], 200)) throw error('AI_INVALID_CONTEXT', 'Invalid business context.'); result[key] = value[key] || null; }
  if (value.experienceYears !== undefined && value.experienceYears !== null && (!Number.isFinite(value.experienceYears) || value.experienceYears < 0 || value.experienceYears > 80)) throw error('AI_INVALID_CONTEXT', 'Invalid experience requirement.');
  result.experienceYears = value.experienceYears ?? null;
  for (const key of ['requiredSkills', 'preferredSkills']) {
    const list = value[key] ?? [];
    if (!Array.isArray(list) || list.length > 30 || list.some(skill => !text(skill, 100) || !skill.trim() || protectedCriterion.test(skill.normalize('NFKC')))) throw error('AI_INVALID_CONTEXT', 'Criteria must be bounded professional skills, excluding protected personal traits.');
    result[key] = [...new Set(list.map(skill => skill.trim()))];
  }
  return result;
};
const skill = { type: 'object', additionalProperties: false, required: ['name', 'reason', 'confidence'], properties: {
  name: { type: 'string' }, reason: { type: 'string' }, confidence: { anyOf: [{ type: 'number' }, { type: 'null' }] },
} };
exports.schema = { type: 'object', additionalProperties: false, required: ['status', 'requiredSkills', 'preferredSkills', 'uncertainty'], properties: {
  status: { type: 'string', enum: ['suggested', 'insufficient_context'] }, requiredSkills: { type: 'array', items: skill }, preferredSkills: { type: 'array', items: skill }, uncertainty: { type: 'array', items: { type: 'string' } },
} };
exports.validateSuggestion = value => {
  const invalid = () => { throw error('AI_INVALID_OUTPUT', 'AI output did not satisfy the professional skills contract.', 502); };
  if (!keys(value, ['status', 'requiredSkills', 'preferredSkills', 'uncertainty']) || !['suggested', 'insufficient_context'].includes(value.status)) invalid();
  const seen = new Set();
  for (const key of ['requiredSkills', 'preferredSkills']) {
    if (!Array.isArray(value[key]) || value[key].length > 15) invalid();
    for (const row of value[key]) {
      if (!keys(row, ['name', 'reason', 'confidence']) || !text(row.name, 100) || !row.name.trim() || protectedCriterion.test(row.name.normalize('NFKC')) || !text(row.reason, 600) || !row.reason.trim() || protectedCriterion.test(row.reason.normalize('NFKC')) || row.confidence !== null && (!Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1)) invalid();
      const id = row.name.normalize('NFKC').trim().toLowerCase(); if (seen.has(id)) invalid(); seen.add(id);
    }
  }
  if (!Array.isArray(value.uncertainty) || value.uncertainty.length > 10 || value.uncertainty.some(note => !text(note, 600) || !note.trim() || protectedCriterion.test(note.normalize('NFKC')))) invalid();
  if (value.status === 'insufficient_context' && seen.size || value.status === 'suggested' && !seen.size) invalid();
  return value;
};
