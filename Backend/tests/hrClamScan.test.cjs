const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createScanner } = require('../services/hrClamScan.service');
const path = require('node:path');
const bytes = Buffer.from('%PDF-SYNTHETIC-SCANNER-INPUT'), now = () => new Date('2026-10-11T12:00:00Z');
const context = () => ({ sha256: crypto.createHash('sha256').update(bytes).digest('hex'), mimeType: 'application/pdf' });
const version = { code: 0, output: 'ClamAV 1.4.2/27950/Sun Oct 11 08:00:00 2026\n' };
const options = { enabled: true, binary: '/usr/bin/clamscan', now, timeoutMs: 100 };
test('ClamAV preparation is disabled by default and validates approved native bounds', async () => {
  await assert.rejects(createScanner().scan(bytes, context()), { code: 'AV_DISABLED' });
  for (const config of [{ binary: 'clamscan' }, { binary: '/usr/bin/sh' }, { maxDefinitionAgeHours: 49 }, { timeoutMs: 16000 }]) assert.throws(() => createScanner({ ...options, ...config }), { code: 'AV_CONFIGURATION' });
});
test('Synthetic transport only: strict verdict, immutable bytes/hash, bounded fixed command and no private diagnostics', async t => {
  for (const [code, output, verdict] of [[0, 'stdin: OK\n', 'clean'], [1, 'stdin: Eicar-Test-Signature FOUND\n', 'infected']]) await t.test(verdict, async () => {
    let snapshot; const scanner = createScanner({ ...options, run: async (binary, args, input) => { if (args[0] === '--version') return version; snapshot = Buffer.from(input); assert.equal(args.at(-1), '-'); assert.ok(args.includes('--alert-exceeds-max=yes')); return { code, output }; } });
    const copy = Buffer.from(bytes), pending = scanner.scan(copy, context()); copy.fill(0);
    const result = await pending; assert.equal(result.verdict, verdict); assert.equal(result.sha256, context().sha256); assert.deepEqual(snapshot, bytes); assert.equal(result.version, '1.4.2-db27950'); assert.equal(result.output, undefined);
  });
  for (const result of [{ code: 0, output: '' }, { code: 0, output: 'private-cv: OK' }, { code: 2, output: 'credential detail' }, { code: 0, output: 'stdin: infected FOUND' }]) await t.test('unknown never clean', async () => { const scanner = createScanner({ ...options, run: async (_, args) => args[0] === '--version' ? version : result }); await assert.rejects(scanner.scan(bytes, context()), e => e.code === 'AV_UNAVAILABLE' && !e.message.includes('credential')); });
});
test('Missing/stale/future definitions and binary do not permit intake', async t => {
  for (const output of ['', 'ClamAV 1.4.2/27950/Fri Oct 9 08:00:00 2026', 'ClamAV 1.4.2/27950/Mon Oct 12 08:00:00 2026']) await t.test(output || 'missing', async () => { let calls = 0; const scanner = createScanner({ ...options, run: async () => { calls++; return { code: 0, output }; } }); await assert.rejects(scanner.scan(bytes, context()), { code: 'AV_DEFINITIONS' }); assert.equal(calls, 1); });
  await assert.rejects(createScanner({ ...options, binary: '/workspace/not-installed/clamscan' }).scan(bytes, context()), { code: 'AV_UNAVAILABLE' });
});
test('Input SHA/MIME/size/cancel and noncooperative worker capacity fail closed', async () => {
  const scanner = createScanner({ ...options, run: () => new Promise(() => {}) });
  for (const [b, c] of [[bytes, { ...context(), sha256: '0'.repeat(64) }], [bytes, { ...context(), mimeType: 'text/html' }], [Buffer.alloc(5 * 1024 * 1024 + 1), context()]]) await assert.rejects(scanner.scan(b, c), { code: 'AV_INPUT' });
  const controller = new AbortController(); controller.abort(); await assert.rejects(scanner.scan(bytes, { ...context(), signal: controller.signal }), { code: 'AV_INPUT' });
  const a = scanner.scan(bytes, context()), b = scanner.scan(bytes, context());
  await assert.rejects(scanner.scan(bytes, context()), { code: 'AV_BUSY' }); await Promise.all([assert.rejects(a, { code: 'AV_TIMEOUT' }), assert.rejects(b, { code: 'AV_TIMEOUT' })]);
  assert.equal(scanner.health().active, 2); await assert.rejects(scanner.scan(bytes, context()), { code: 'AV_BUSY' });
});
test('Native subprocess adapter strips inherited secrets and sends original only over stdin; synthetic executable is not real AV', async () => {
  // Immutable test code remains executable when document scratch is noexec.
  const binary = path.join(__dirname, 'helpers/nativeAvFixture/clamscan'), old = process.env.SYNTHETIC_AV_SECRET;
  try {
    process.env.SYNTHETIC_AV_SECRET = 'synthetic-not-real';
    const r = await createScanner({ ...options, binary, timeoutMs: 1000 }).scan(bytes, context()); assert.equal(r.verdict, 'clean'); assert.equal(r.sha256, context().sha256);
  } finally { if (old === undefined) delete process.env.SYNTHETIC_AV_SECRET; else process.env.SYNTHETIC_AV_SECRET = old; }
});
