const test = require('node:test'), assert = require('node:assert/strict');
const https = require('node:https');
const { withAuditFixture } = require('./helpers/auditFixture.cjs');
const storage = require('../services/hrPrivateObjectStorage.service');

test('Analytics storage status describes configuration without probing storage or claiming live readiness', async t => withAuditFixture(async h => {
  const fields = ['PROVIDER', 'ENDPOINT', 'BUCKET', 'REGION', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY', 'SESSION_TOKEN'].map(k => 'HR_CV_STORAGE_' + k);
  const gates = ['HR_CV_DURABLE_INTAKE_ENABLED', 'HR_CV_SCAN_ENABLED', 'HR_CV_INTAKE_WORKER_ENABLED', 'HR_CV_OCR_ENABLED', 'HR_CV_AI_PROCESSING_ENABLED'];
  const before = Object.fromEntries([...fields, ...gates].map(k => [k, process.env[k]]));
  const fromEnvironment = storage.fromEnvironment, request = https.request;
  let constructions = 0, probes = 0;
  const synthetic = {
    HR_CV_STORAGE_PROVIDER: 's3', HR_CV_STORAGE_ENDPOINT: 'https://' + 'a'.repeat(32) + '.r2.cloudflarestorage.com',
    HR_CV_STORAGE_BUCKET: 'synthetic-private-cv', HR_CV_STORAGE_REGION: 'auto',
    HR_CV_STORAGE_ACCESS_KEY_ID: 'synthetic_access_key_canary', HR_CV_STORAGE_SECRET_ACCESS_KEY: 'synthetic_secret_key_canary',
  };
  storage.fromEnvironment = (...args) => {
    constructions++;
    const store = fromEnvironment(...args); // Real existing configuration validator; no external I/O.
    return Object.fromEntries(Object.keys(store).map(k => [k, () => { probes++; throw Error('Storage probing is forbidden in analytics'); }]));
  };
  https.request = () => { probes++; throw Error('External I/O is forbidden'); };
  try {
    for (const key of fields) delete process.env[key];
    for (const key of gates) process.env[key] = 'false';
    for (const [name, input, expected] of [
      ['missing', {}, 'not_configured'],
      ['disabled', { HR_CV_STORAGE_PROVIDER: 'disabled' }, 'not_configured'],
      ['invalid', { ...synthetic, HR_CV_STORAGE_ENDPOINT: 'http://invalid.invalid' }, 'configuration_required'],
      ['configured R2', synthetic, 'configured_not_verified'],
    ]) await t.test(name, async () => {
      for (const key of fields) delete process.env[key];
      Object.assign(process.env, input);
      for (const suffix of ['', '/operations']) {
        const r = await h.request('admin', 'GET', '/hr/analytics' + suffix);
        assert.equal(r.status, 200); assert.equal(r.data.integrations.storage, expected);
        assert.ok(!r.buffer.toString().includes('local_file_system'));
        for (const value of [synthetic.HR_CV_STORAGE_ENDPOINT, synthetic.HR_CV_STORAGE_BUCKET, synthetic.HR_CV_STORAGE_ACCESS_KEY_ID, synthetic.HR_CV_STORAGE_SECRET_ACCESS_KEY]) assert.ok(!r.buffer.toString().includes(value));
        assert.equal(probes, 0);
      }
      const calls = constructions;
      const overview = await h.request('admin', 'GET', '/hr/analytics/overview');
      assert.equal(overview.status, 200); assert.equal(overview.data.integrations, undefined);
      assert.equal(constructions, calls, 'Overview must not inspect optional storage configuration');
      assert.equal((await h.request('anonymous', 'GET', '/hr/analytics/operations')).status, 401);
      assert.equal((await h.request('none', 'GET', '/hr/analytics/operations')).status, 403);
      assert.equal(constructions, calls, 'Denied callers cannot inspect storage configuration');
      for (const gate of gates) assert.equal(process.env[gate], 'false');
    });
  } finally {
    storage.fromEnvironment = fromEnvironment; https.request = request;
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}));
