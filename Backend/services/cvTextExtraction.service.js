const path = require('node:path');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const MAX_TEXT = 100000, MAX_PAGES = 50;
function normalize(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
async function extractCvResult(buffer, filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.docx') {
    const { validContent } = require('./uploadContent.service');
    if (!validContent(buffer, '.docx')) throw Error('Invalid document.');
    const result = await mammoth.extractRawText({ buffer }); const text = normalize(result.value);
    return { text: text.slice(0, MAX_TEXT), warnings: text.length > MAX_TEXT ? ['text_limit'] : [] };
  }
  if (extension !== '.pdf' || !buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw Error('Invalid document.');
  const parser = new PDFParse({ data: buffer, verbosity: 0, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, maxImageSize: 4000000 });
  try {
    const info = await parser.getInfo(), chunks = []; let length = 0; const warnings = [];
    if (info.total > MAX_PAGES) warnings.push('page_limit');
    for (let page = 1; page <= Math.min(info.total, MAX_PAGES); page++) {
      const result = await parser.getText({ partial: [page] }); const text = normalize(result.text);
      const separator = chunks.length ? '\n\n' : '', remaining = MAX_TEXT - length - separator.length;
      if (text.length > remaining) { chunks.push(separator + text.slice(0, Math.max(0, remaining))); warnings.push('text_limit'); break; }
      chunks.push(separator + text); length += separator.length + text.length;
    }
    return { text: chunks.join('').slice(0, MAX_TEXT), warnings };
  } finally { await parser.destroy(); }
}
module.exports = { extractCvResult, MAX_TEXT, MAX_PAGES };
