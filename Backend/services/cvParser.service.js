const fs = require('node:fs/promises');
const path = require('node:path');
const { pool, MAX_BYTES } = require('./documentWorkerPool.service');
function parseCvResultFromBuffer(buffer, filename, options) { return pool.run('parse', buffer, filename, options); }
function extractCvResultFromBuffer(buffer, filename, options) { return pool.run('extract', buffer, filename, options); }
async function extractCvTextFromBuffer(buffer, filename, options) { return (await extractCvResultFromBuffer(buffer, filename, options)).text; }
async function extractCvTextFromFile(filePath, filename, options) {
  if ((await fs.stat(filePath)).size > MAX_BYTES) throw Object.assign(new Error('Document input limit exceeded.'), { code: 'DOCUMENT_LIMIT' });
  return extractCvTextFromBuffer(await fs.readFile(filePath), filename || path.basename(filePath), options);
}
module.exports = { parseCvResultFromBuffer, extractCvTextFromBuffer, extractCvTextFromFile, extractCvResultFromBuffer };
