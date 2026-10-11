const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const failure = code => Object.assign(new Error('Private document scanning is unavailable.'), { code, status: 503 });
const MAX_BYTES = 5 * 1024 * 1024;

// No shell, inherited environment, temporary CV, logging or automatic installation.
function nativeRun(binary, args, input, signal) {
  return new Promise((resolve, reject) => {
    let child, output = '', exceeded = false, size = 0;
    try { child = spawn(binary, args, { shell: false, env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C', TZ: 'UTC' }, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch { reject(failure('AV_UNAVAILABLE')); return; }
    const stop = () => child.kill('SIGKILL');
    const read = (chunk, stdout) => {
      size += chunk.length;
      if (size > 4096) { exceeded = true; stop(); return; }
      if (stdout) output += chunk.toString('utf8');
    };
    child.stdout.on('data', chunk => read(chunk, true));
    child.stderr.on('data', chunk => read(chunk, false));
    child.stdin.on('error', () => {});
    child.once('error', () => { signal.removeEventListener('abort', stop); reject(failure('AV_UNAVAILABLE')); });
    child.once('close', code => { signal.removeEventListener('abort', stop); if (exceeded || signal.aborted) reject(failure('AV_UNAVAILABLE')); else resolve({ code, output }); });
    signal.addEventListener('abort', stop, { once: true });
    if (signal.aborted) stop();
    child.stdin.end(input);
  });
}

function createScanner({ enabled = false, binary, maxDefinitionAgeHours = 24, timeoutMs = 10000, now = () => new Date(), run = nativeRun } = {}) {
  if (enabled && (typeof binary !== 'string' || !path.isAbsolute(binary) || path.basename(binary) !== 'clamscan' || !Number.isFinite(maxDefinitionAgeHours) || maxDefinitionAgeHours <= 0 || maxDefinitionAgeHours > 48 || !Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 15000 || typeof run !== 'function')) throw failure('AV_CONFIGURATION');
  let active = 0;
  async function scan(input, context = {}) {
    if (!enabled) throw failure('AV_DISABLED');
    if (!Buffer.isBuffer(input) || !input.length || input.length > MAX_BYTES || !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(context.mimeType)) throw failure('AV_INPUT');
    const bytes = Buffer.from(input), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== context.sha256 || context.signal?.aborted) throw failure('AV_INPUT');
    if (active >= 2) throw failure('AV_BUSY');
    active++;
    const controller = new AbortController();
    const abort = () => controller.abort();
    context.signal?.addEventListener('abort', abort, { once: true });
    let rejectDeadline;
    const expired = new Promise((_, reject) => { rejectDeadline = reject; });
    const timer = setTimeout(() => { abort(); rejectDeadline(failure('AV_TIMEOUT')); }, timeoutMs);
    const cancelled = () => rejectDeadline(failure('AV_CANCELLED'));
    context.signal?.addEventListener('abort', cancelled, { once: true });
    const work = (async () => {
      const version = await run(binary, ['--version'], Buffer.alloc(0), controller.signal);
      if (controller.signal.aborted) throw failure('AV_CANCELLED');
      const info = /^ClamAV ([\d.]{1,20})\/(\d{1,12})\/([^\r\n]{1,80})\s*$/.exec(version?.output || '');
      const date = info ? Date.parse(info[3] + ' UTC') : NaN, age = now().getTime() - date;
      if (version?.code !== 0 || !info || !Number.isFinite(age) || age < -300000 || age > maxDefinitionAgeHours * 3600000) throw failure('AV_DEFINITIONS');
      const result = await run(binary, ['--stdout', '--no-summary', '--scan-archive=yes', '--max-filesize=5M', '--max-scansize=20M', '--max-recursion=8', '--max-files=100', '--alert-exceeds-max=yes', '--alert-encrypted=yes', '-'], bytes, controller.signal);
      if (controller.signal.aborted) throw failure('AV_CANCELLED');
      let verdict;
      if (result?.code === 0 && /^stdin: OK\s*$/.test(result.output)) verdict = 'clean';
      else if (result?.code === 1 && /^stdin: [^\r\n]{1,200} FOUND\s*$/.test(result.output)) verdict = 'infected';
      else throw failure('AV_UNAVAILABLE');
      return { verdict, sha256, engine: 'clamav', version: `${info[1]}-db${info[2]}` };
    })();
    // Noncooperative injected/native work retains its slot until actual settlement.
    work.finally(() => { active--; }).catch(() => {});
    try { return await Promise.race([work, expired]); }
    finally { clearTimeout(timer); context.signal?.removeEventListener('abort', abort); context.signal?.removeEventListener('abort', cancelled); }
  }
  return Object.freeze({ scan, health: () => ({ enabled, active, realScannerVerified: false }) });
}
module.exports = { createScanner };
