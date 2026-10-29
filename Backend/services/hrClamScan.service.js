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

function createNativeScanner({ enabled = false, binary, maxDefinitionAgeHours = 24, timeoutMs = 10000, now = () => new Date(), run = nativeRun } = {}) {
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


// Optional local transport only. Native subprocess behavior above stays unchanged.
function createUnixScanner({ enabled = false, socketPath, daemonConfigPath, socketUid = process.getuid?.(), maxDefinitionAgeHours = 24, timeoutMs = 10000, now = () => new Date() } = {}) {
  const fs = require('node:fs/promises'), net = require('node:net');
  const localPath = value => typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value && !/[\x00-\x1f]/.test(value);
  if (enabled && (!localPath(socketPath) || Buffer.byteLength(socketPath) > 100 || !localPath(daemonConfigPath) || !Number.isInteger(socketUid) || socketUid < 0 || !Number.isFinite(maxDefinitionAgeHours) || maxDefinitionAgeHours <= 0 || maxDefinitionAgeHours > 24 || !Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 10000)) throw failure('AV_CONFIGURATION');
  let active = 0, sequence = 0, poisoned;
  let observed = { configured: enabled, daemonReachable: false, engineInitialized: false, signaturesFresh: false, ready: false, code: enabled ? 'AV_NOT_CHECKED' : 'AV_DISABLED' };
  const identity = s => `${s.dev}:${s.ino}:${s.ctimeMs}`;
  const fresh = date => Number.isFinite(date) && now().getTime() - date >= -300000 && now().getTime() - date <= maxDefinitionAgeHours * 3600000;
  async function protectedPath(file, socket = false) {
    const stat = await fs.lstat(file), parent = await fs.stat(path.dirname(file));
    if ((socket ? !stat.isSocket() || stat.uid !== socketUid : !stat.isFile() || stat.size > 16384 || ![0, socketUid, process.getuid?.()].includes(stat.uid)) || stat.isSymbolicLink() || stat.mode & (socket ? 0o007 : 0o022) || parent.mode & 0o002 || await fs.realpath(file) !== file) throw failure('AV_CONFIGURATION');
    return stat;
  }
  async function policy() {
    const checked = await protectedPath(daemonConfigPath);
    const handle = await fs.open(daemonConfigPath, require('node:fs').constants.O_RDONLY | require('node:fs').constants.O_NOFOLLOW);
    let data;
    try {
      const stat = await handle.stat(), buffer = Buffer.alloc(16385);
      if (!stat.isFile() || identity(stat) !== identity(checked) || stat.size > 16384 || stat.mode & 0o022) throw failure('AV_CONFIGURATION');
      const {bytesRead} = await handle.read(buffer,0,buffer.length,0);
      if (bytesRead > 16384) throw failure('AV_CONFIGURATION');
      data = buffer.subarray(0,bytesRead);
    } finally { await handle.close(); }
    const values = new Map();
    for (const line of data.toString('utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'))) {
      const item = /^([A-Za-z][A-Za-z0-9]*)\s+(\S+)$/.exec(line);
      if (!item || values.has(item[1])) throw failure('AV_CONFIGURATION');
      values.set(item[1], item[2]);
    }
    const required = { LocalSocket: socketPath, LocalSocketMode: '660', Foreground: 'yes', MaxThreads: '2', MaxQueue: '4', StreamMaxLength: '5M', MaxFileSize: '5M', MaxScanSize: '20M', MaxRecursion: '8', MaxFiles: '100', MaxScanTime: '10000', AlertExceedsMax: 'yes', AlertEncrypted: 'yes', ScanArchive: 'yes', ScanPDF: 'yes', ScanOLE2: 'yes', ScanPE: 'yes', ScanELF: 'yes', LeaveTemporaryFiles: 'no', ConcurrentDatabaseReload: 'no' };
    const optional = new Set(['DatabaseDirectory','PidFile','LogFile','LogTime','LogVerbose','SelfCheck','FixStaleSocket','TemporaryDirectory','User','MaxConnectionQueueLength']);
    if (Object.entries(required).some(([k,v]) => values.get(k) !== v) || [...values.keys()].some(k => !Object.hasOwn(required,k) && !optional.has(k))) throw failure('AV_CONFIGURATION');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  function version(reply) {
    const info = /^ClamAV ([\d.]{1,20})\/(\d{1,12})\/([^\r\n\x00]{1,80})$/.exec(reply);
    if (!info) throw failure('AV_DEFINITIONS');
    return { date: Date.parse(info[3] + ' UTC'), value: `${info[1]}-db${info[2]}`, raw: reply };
  }
  // One command per connection, bounded NUL-framed reply. A submitted scan keeps
  // its slot after caller timeout until the daemon replies/closes; never retry it.
  function request(command, bytes, signal, socketIdentity) {
    return new Promise((resolve, reject) => {
      let client, sent = false, ended = false, size = 0, chunks = [], settled = false;
      const finish = (error, value) => {
        if (settled) return; settled = true; signal.removeEventListener('abort', abort);
        if (error && sent) poisoned = socketIdentity;
        client?.destroy(); error ? reject(error) : resolve(value);
      };
      const abort = () => {
        if (sent) client.unref(); // Caller fails now; daemon work is NOT assumed cancelled.
        else finish(failure('AV_CANCELLED'));
      };
      if (signal.aborted) return finish(failure('AV_CANCELLED'));
      try { client = net.createConnection({ path: socketPath }); } catch { return finish(failure('AV_UNAVAILABLE')); }
      signal.addEventListener('abort', abort, { once: true });
      client.once('connect', () => {
        if (signal.aborted) return abort();
        client.write(`z${command}\0`);
        if (bytes) {
          sent = true;
          for (let i = 0; i < bytes.length; i += 16384) {
            const chunk = bytes.subarray(i, i + 16384), length = Buffer.alloc(4); length.writeUInt32BE(chunk.length);
            client.write(length); client.write(chunk);
          }
          client.write(Buffer.alloc(4));
        }
      });
      client.on('data', chunk => {
        if ((size += chunk.length) > 4096) return finish(failure('AV_UNAVAILABLE'));
        chunks.push(chunk);
      });
      client.once('end', () => {
        ended = true; const data = Buffer.concat(chunks);
        if (!data.length || data.at(-1) !== 0 || data.subarray(0,-1).includes(0)) return finish(failure('AV_UNAVAILABLE'));
        finish(null, data.subarray(0,-1).toString('utf8'));
      });
      client.once('error', () => finish(failure('AV_UNAVAILABLE')));
      client.once('close', () => { if (!ended) finish(failure('AV_UNAVAILABLE')); });
    });
  }
  async function perform(bytes, sha256, context) {
    if (!enabled) throw failure('AV_DISABLED');
    if (active >= 2) throw failure('AV_BUSY');
    active++; const ticket = ++sequence, state = { configured: true, daemonReachable: false, engineInitialized: false, signaturesFresh: false, ready: false };
    observed = { ...state, code: 'AV_CHECKING' };
    const controller = new AbortController(); let rejectExpired;
    const expired = new Promise((_, reject) => { rejectExpired = reject; });
    const abort = () => { controller.abort(); rejectExpired(failure('AV_CANCELLED')); };
    context.signal?.addEventListener('abort', abort, {once:true});
    const timer = setTimeout(() => { controller.abort(); rejectExpired(failure('AV_TIMEOUT')); }, timeoutMs);
    const work = (async () => {
      const policyHash = await policy(), before = identity(await protectedPath(socketPath,true));
      if (poisoned === before) throw failure('AV_RECOVERY_REQUIRED');
      if (poisoned) poisoned = undefined; // Only a different protected socket identity recovers.
      if (controller.signal.aborted) throw failure('AV_CANCELLED');
      if (await request('PING',null,controller.signal,before) !== 'PONG') throw failure('AV_UNAVAILABLE');
      state.daemonReachable = true;
      const first = version(await request('VERSION',null,controller.signal,before)); state.engineInitialized = true; state.definitionDate = first.date;
      if (!fresh(first.date)) throw failure('AV_DEFINITIONS');
      state.signaturesFresh = true;
      const result = await request('INSTREAM',bytes,controller.signal,before);
      if (controller.signal.aborted) throw failure('AV_CANCELLED');
      let verdict;
      if (result === 'stream: OK') verdict = 'clean';
      else if (/^stream: [^\r\n\x00]{1,200} FOUND$/.test(result)) verdict = 'infected';
      else { poisoned = before; throw failure('AV_UNAVAILABLE'); }
      const after = version(await request('VERSION',null,controller.signal,before));
      if (first.raw !== after.raw || !fresh(after.date) || before !== identity(await protectedPath(socketPath,true)) || policyHash !== await policy()) throw failure('AV_DEFINITIONS');
      if (controller.signal.aborted) throw failure('AV_CANCELLED');
      if (ticket === sequence) observed = {...state, ready:true, code:'AV_READY', definitionDate:after.date};
      return { verdict, sha256, engine:'clamav', version:after.value };
    })();
    work.finally(() => { active--; }).catch(() => {});
    try { return await Promise.race([work,expired]); }
    catch (error) {
      const code = ['AV_CONFIGURATION','AV_DEFINITIONS','AV_BUSY','AV_CANCELLED','AV_TIMEOUT','AV_RECOVERY_REQUIRED'].includes(error?.code) ? error.code : 'AV_UNAVAILABLE';
      if (ticket === sequence) observed = {...state,ready:false,code};
      throw failure(code);
    } finally { clearTimeout(timer); context.signal?.removeEventListener('abort',abort); }
  }
  async function scan(input, context = {}) {
    if (!enabled) throw failure('AV_DISABLED');
    if (!Buffer.isBuffer(input) || !input.length || input.length > MAX_BYTES || !['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(context.mimeType)) throw failure('AV_INPUT');
    const bytes = Buffer.from(input), sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== context.sha256 || context.signal?.aborted) throw failure('AV_INPUT');
    return perform(bytes,sha256,context);
  }
  function health() {
    const {definitionDate,...safe} = observed;
    const signaturesFresh = safe.signaturesFresh && fresh(definitionDate);
    return {...safe,signaturesFresh,ready:safe.ready && signaturesFresh && active < 2 && !poisoned,enabled,active,transport:'clamd-unix',realScannerVerified:false};
  }
  async function readiness() {
    if (active >= 2) return {...health(),ready:false,code:'AV_BUSY'};
    const bytes = Buffer.from('%PDF-1.7\n% INOP synthetic readiness\n%%EOF\n');
    try { const result = await scan(bytes,{sha256:crypto.createHash('sha256').update(bytes).digest('hex'),mimeType:'application/pdf'}); if (result.verdict !== 'clean') observed = {...observed,ready:false,code:'AV_UNAVAILABLE'}; } catch { /* Only sanitized stage/code snapshot. */ }
    return health();
  }
  return Object.freeze({scan,readiness,health});
}
function createScanner(options = {}) {
  if (options.transport === 'clamd-unix') return createUnixScanner(options);
  if (options.transport && options.transport !== 'clamscan') throw failure('AV_CONFIGURATION');
  return createNativeScanner(options);
}
module.exports = { createScanner };
