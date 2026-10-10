const crypto = require('node:crypto');
const { extractCvTextFromBuffer } = require('./cvParser.service');
const { parseStructuredCv, normalizePhone } = require('./cvStructuredParser.service');

async function reviewForFile(file) {
  if (!file) return null;
  const original = { originalName: file.originalname, mimeType: file.mimetype,
    size: file.size, sha256: crypto.createHash('sha256').update(file.buffer).digest('hex') };
  try {
    const text = await extractCvTextFromBuffer(file.buffer, file.originalname);
    if (!text) return { original, review: { version: 'rules-2', provider: 'rule-based', processingStatus: 'unsupported_ocr', reviewStatus: 'pending', fields: {}, warnings: ['ocr_required'] }, parsed: null };
    const parsed = parseStructuredCv(text);
    return { original, review: { ...parsed.extraction, processingStatus: 'extracted' }, parsed };
  } catch {
    // Never log CV content or provider input on parsing failure.
    return { original, review: { version: 'rules-2', provider: 'rule-based', processingStatus: 'failed', reviewStatus: 'pending', fields: {}, warnings: ['extraction_failed'] }, parsed: null };
  }
}

function contactPhone(value) {
  const raw = value == null ? '' : String(value).trim().slice(0, 80);
  return { phoneRaw: raw, phone: normalizePhone(raw) };
}

// This metadata is computed on the server; incoming extraction/confidence is
// never trusted. Review confirmation is explicitly made by an authorized HR.
function manualReview(req, current, update) {
  if (req.body.reviewStatus !== undefined && !['pending', 'confirmed', 'corrected'].includes(req.body.reviewStatus)) return null;
  const changed = Object.keys(update).filter(key => !['cvUrl', 'cvOriginal', 'cvReview', 'status'].includes(key) &&
    JSON.stringify(current?.[key]) !== JSON.stringify(update[key]));
  const review = current?.cvReview?.toObject?.() || current?.cvReview || {};
  if (!review.version) return req.body.reviewStatus !== undefined ? null : undefined;
  const confirmed = ['confirmed', 'corrected'].includes(req.body.reviewStatus);
  return { ...review, reviewStatus: req.body.reviewStatus || (changed.length ? 'corrected' : review.reviewStatus || 'pending'),
    reviewedBy: confirmed || changed.length ? req.user.id : review.reviewedBy,
    reviewedAt: confirmed || changed.length ? new Date() : review.reviewedAt,
    correctedFields: [...new Set([...(review.correctedFields || []), ...changed])] };
}

function historyInput(value) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return null; } }
  if (!Array.isArray(value) || value.length > 50) return null;
  const result = [];
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    const text = v => v == null ? null : typeof v === 'string' && v.length <= 500 ? v.trim() : undefined;
    const date = v => {
      if (v == null) return null;
      if (!v || !Number.isInteger(v.year) || v.year < 1900 || v.year > 2100 ||
          (v.month != null && (!Number.isInteger(v.month) || v.month < 1 || v.month > 12))) return undefined;
      return { year: v.year, month: v.month ?? null };
    };
    const cleaned = { raw: row.raw == null ? '' : text(row.raw), organization: text(row.organization), title: text(row.title),
      start: date(row.start), end: date(row.end), ongoing: row.ongoing === true };
    if (Object.values(cleaned).includes(undefined)) return null;
    if (cleaned.start && cleaned.end && (cleaned.end.year < cleaned.start.year ||
        (cleaned.end.year === cleaned.start.year && cleaned.start.month && cleaned.end.month && cleaned.end.month < cleaned.start.month))) return null;
    result.push(cleaned);
  }
  return result;
}

module.exports = { reviewForFile, contactPhone, manualReview, historyInput };
