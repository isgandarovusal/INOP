const test = require('node:test');
const assert = require('node:assert/strict');
const util = require('node:util');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const Candidate = require('../models/candidate.model');
const { globalErrorHandler } = require('../middleware/error.middleware');
const marker = 'SYNTHETIC_PRIVATE_CV_MARKER_NOT_A_CREDENTIAL';
async function capture(callback) {
  const calls = [], original = console.error;
  console.error = (...args) => { calls.push(args); };
  try { const result = await callback(); return { result, leaked: util.inspect(calls).includes(marker), calls }; }
  finally { console.error = original; }
}
function respond(error) {
  let status, data;
  const response = { headersSent: false, status(value) { status = value; return this; }, json(value) { data = value; return this; } };
  globalErrorHandler(error, {}, response, () => {});
  return { status, data };
}
test('HR failures keep raw request, CV, credential and database error content out of logs', async t => withAuditFixture(async h => {
  await t.test('actual unauthenticated malformed JSON is private in logs and response', async () => {
    const { result, leaked } = await capture(async () => {
      const response = await fetch(h.apiBase + '/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"cv":"' + marker + '" invalid}' });
      return { status: response.status, text: await response.text() };
    });
    assert.equal(result.status, 400); assert.equal(leaked, false, 'Raw malformed request must not enter logs');
    assert.equal(result.text.includes(marker), false, 'Parser excerpts must not enter the response');
    assert.equal(JSON.parse(result.text).success, false);
  });
  await t.test('actual Candidate route sanitizes an injected database failure without saving data', async () => {
    const save = Candidate.prototype.save, before = await Candidate.countDocuments();
    Candidate.prototype.save = async () => { throw Object.assign(new Error(marker), { body: marker, keyValue: { email: marker }, stack: marker, cause: { token: marker } }); };
    try {
      const { result, leaked } = await capture(() => h.request('admin', 'POST', '/candidates', { name: 'Synthetic privacy fixture', role: 'Cashier' }));
      assert.equal(result.status, 500); assert.equal(leaked, false, 'Raw model failure must not enter HR logs');
      assert.equal(JSON.stringify(result.data).includes(marker), false);
      assert.equal(await Candidate.countDocuments(), before);
    } finally { Candidate.prototype.save = save; }
  });
  for (const [name, error, status, code] of [
    ['validation', Object.assign(new Error(marker), { name: 'ValidationError', errors: { name: { value: marker, message: marker } } }), 400, 'VALIDATION_ERROR'],
    ['cast', Object.assign(new Error(marker), { name: 'CastError', value: marker }), 400, 'INVALID_ID'],
    ['duplicate', Object.assign(new Error(marker), { code: 11000, keyValue: { email: marker }, keyPattern: { email: 1 } }), 409, 'DUPLICATE_VALUE'],
    ['unknown', Object.assign(new Error(marker), { body: marker, cause: { token: marker } }), 500, 'INTERNAL_SERVER_ERROR'],
  ]) await t.test(name + ' preserves status/code while log metadata cannot leak the raw error', async () => {
    const { result, leaked } = await capture(() => respond(error));
    assert.equal(result.status, status); assert.equal(result.data.code, code); assert.equal(result.data.success, false); assert.equal(leaked, false);
    assert.equal(JSON.stringify(result.data).includes(marker), false);
  });
  await t.test('native Multer limit/status/code contracts remain without logging filenames', async () => {
    const multer = require('multer');
    for (const [code, status] of [['LIMIT_FILE_SIZE', 413], ['LIMIT_UNEXPECTED_FILE', 400]]) {
      const error = new multer.MulterError(code, 'cv'); error.message = marker; error.filename = marker;
      const { result, leaked } = await capture(() => respond(error));
      assert.equal(result.status, status); assert.equal(result.data.code, code); assert.equal(leaked, false);
      assert.equal(JSON.stringify(result.data).includes(marker), false);
    }
  });
  await t.test('body-parser large request keeps 413 without body/stack/name/code in logs', async () => {
    const error = Object.assign(new Error(marker), { type: 'entity.too.large', status: 413, body: marker });
    const { result, leaked } = await capture(() => respond(error));
    assert.equal(result.status, 413); assert.equal(result.data.code, 'REQUEST_ERROR'); assert.equal(leaked, false); assert.equal(JSON.stringify(result.data).includes(marker), false);
  });
}));
