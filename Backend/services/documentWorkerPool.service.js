const path = require('node:path');
const { Worker } = require('node:worker_threads');
const MAX_BYTES = 5 * 1024 * 1024;
const codes = new Set(['DOCUMENT_INVALID', 'DOCUMENT_LIMIT', 'DOCUMENT_WORKER_FAILED']);
function failure(code) {
  return Object.assign(new Error('Document processing could not complete.'), { code, status: ['DOCUMENT_BUSY', 'DOCUMENT_TIMEOUT'].includes(code) ? 503 : 422 });
}
class DocumentWorkerPool {
  constructor({ concurrency = 1, maxQueue = 8, timeoutMs = 15000, workerFile = path.join(__dirname, 'document.worker.cjs') } = {}) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2 || !Number.isInteger(maxQueue) || maxQueue < 0 || maxQueue > 8 || !Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 15000) throw new RangeError('Invalid document worker limits.');
    this.concurrency = concurrency; this.maxQueue = maxQueue; this.timeoutMs = timeoutMs; this.workerFile = workerFile;
    this.queue = []; this.active = new Set(); this.closed = false;
    this.counts = { completed: 0, rejected: 0, timedOut: 0 };
  }
  stats() { return { active: this.active.size, queued: this.queue.length, ...this.counts }; }
  run(operation, buffer, filename, { signal } = {}) {
    if (!['validate', 'extract', 'parse'].includes(operation) || !Buffer.isBuffer(buffer) || !buffer.length || typeof filename !== 'string' || filename.length > 255) return Promise.reject(failure('DOCUMENT_INVALID'));
    if (buffer.length > MAX_BYTES) return Promise.reject(failure('DOCUMENT_LIMIT'));
    if (this.closed || signal?.aborted) return Promise.reject(failure('DOCUMENT_CANCELED'));
    if (this.active.size >= this.concurrency && this.queue.length >= this.maxQueue) { this.counts.rejected++; return Promise.reject(failure('DOCUMENT_BUSY')); }
    return new Promise((resolve, reject) => {
      const task = { operation, buffer, filename, resolve, reject, signal, settled: false };
      task.abort = () => this.finish(task, failure('DOCUMENT_CANCELED'));
      task.timer = setTimeout(() => { this.counts.timedOut++; this.finish(task, failure('DOCUMENT_TIMEOUT')); }, this.timeoutMs);
      signal?.addEventListener('abort', task.abort, { once: true });
      this.queue.push(task); this.drain();
    });
  }
  finish(task, error, value) {
    if (task.settled) return;
    task.settled = true; clearTimeout(task.timer); task.signal?.removeEventListener('abort', task.abort);
    task.buffer = null; this.queue = this.queue.filter(queued => queued !== task);
    if (error) task.reject(error); else { this.counts.completed++; task.resolve(value); }
    if (task.worker) void task.worker.terminate().catch(() => {});
    else { this.active.delete(task); this.drain(); }
  }
  drain() {
    while (!this.closed && this.active.size < this.concurrency && this.queue.length) {
      const task = this.queue.shift(); if (task.settled) continue;
      this.active.add(task);
      try {
        // Transfer a private copy; the original request/file buffer remains intact.
        const bytes = Uint8Array.from(task.buffer); task.buffer = null;
        task.worker = new Worker(this.workerFile, {
          workerData: { operation: task.operation, bytes: bytes.buffer, filename: task.filename }, transferList: [bytes.buffer],
          resourceLimits: { maxOldGenerationSizeMb: 192, maxYoungGenerationSizeMb: 32, stackSizeMb: 8 },
          env: { NODE_ENV: process.env.NODE_ENV || 'production' }, stdout: true, stderr: true,
        });
        // Parser diagnostics may contain untrusted document content; never forward them.
        task.worker.stdout.resume(); task.worker.stderr.resume();
        task.worker.once('message', message => {
          if (message?.ok !== true) return this.finish(task, failure(codes.has(message?.code) ? message.code : 'DOCUMENT_WORKER_FAILED'));
          const value = message.value;
          let valid = task.operation === 'validate' ? typeof value === 'boolean' : value && typeof value.text === 'string' && value.text.length <= 100000 && Array.isArray(value.warnings) && value.warnings.length <= 2 && value.warnings.every(code => ['text_limit', 'page_limit'].includes(code));
          if (valid && task.operation === 'parse') valid = value.text ? value.parsed && value.parsed.rawText === value.text && value.parsed.extraction?.version === 'rules-2' && value.parsed.extraction?.provider === 'rule-based' && Buffer.byteLength(JSON.stringify(value)) <= 4 * 1024 * 1024 : value.parsed === null;
          this.finish(task, valid ? null : failure('DOCUMENT_WORKER_FAILED'), value);
        });
        task.worker.once('error', () => this.finish(task, failure('DOCUMENT_WORKER_FAILED')));
        task.worker.once('exit', () => { if (!task.settled) this.finish(task, failure('DOCUMENT_WORKER_FAILED')); this.active.delete(task); this.drain(); });
      } catch { this.finish(task, failure('DOCUMENT_WORKER_FAILED')); }
    }
  }
  async close() {
    this.closed = true;
    const tasks = [...this.queue, ...this.active];
    for (const task of tasks) this.finish(task, failure('DOCUMENT_CANCELED'));
    await Promise.all(tasks.filter(task => task.worker).map(task => task.worker.terminate().catch(() => {})));
  }
}
const pool = new DocumentWorkerPool();
module.exports = { DocumentWorkerPool, pool, MAX_BYTES };
