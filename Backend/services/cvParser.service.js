const fs = require("node:fs/promises");
const path = require("node:path");
const { Worker } = require("node:worker_threads");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_WORKERS = 2;
const MAX_QUEUED_REQUESTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;
const workers = new Set();
const queue = [];

function parserError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}

function validateInput(buffer, filename) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw parserError("CV faylı düzgün buffer formatında deyil.", 400, "INVALID_FILE");
  }
  if (buffer.length > MAX_FILE_SIZE) {
    throw parserError("CV faylı 5 MB həddini aşır.", 413, "CV_TOO_LARGE");
  }
  if (typeof filename !== "string" || ![".pdf", ".docx"].includes(path.extname(filename).toLowerCase())) {
    throw parserError("Dəstəklənməyən CV formatıdır. Yalnız PDF və DOCX qəbul olunur.", 400, "INVALID_FILE");
  }
}

function settle(job, error, text) {
  clearTimeout(job.timer);
  if (error) job.reject(error);
  else job.resolve(text);
}

function retireWorker(slot, error) {
  if (slot.closing) return;
  slot.closing = true;
  if (slot.job) {
    settle(slot.job, error);
    slot.job = null;
  }
  // Replacement workers must wait until the old parser has actually stopped.
  slot.worker.terminate().catch(() => {}).finally(() => {
    workers.delete(slot);
    drainQueue();
  });
}

function createWorker() {
  const worker = new Worker(path.join(__dirname, "cvParser.worker.js"), {
    resourceLimits: {
      maxOldGenerationSizeMb: 128,
      maxYoungGenerationSizeMb: 32,
      stackSizeMb: 4,
    },
  });
  const slot = { worker, job: null, closing: false };
  workers.add(slot);
  worker.on("message", (result) => {
    if (slot.closing || !slot.job) return;
    const job = slot.job;
    slot.job = null;
    worker.unref();
    if (result.error) {
      settle(job, parserError(result.error.message, result.error.status, result.error.code));
    } else if (typeof result.text === "string") {
      settle(job, null, result.text);
    } else {
      settle(job, parserError("CV emal edilərkən xəta baş verdi.", 422, "CV_PARSE_FAILED"));
    }
    drainQueue();
  });
  worker.on("error", () => retireWorker(slot,
    parserError("CV emal edilərkən xəta baş verdi.", 422, "CV_WORKER_FAILED")));
  worker.on("exit", () => retireWorker(slot,
    parserError("CV emal edilərkən xəta baş verdi.", 422, "CV_WORKER_FAILED")));
  // Retain initialized parsers for reuse without keeping CLI commands or test
  // runners alive when there are no active jobs.
  worker.unref();
  return slot;
}

function drainQueue() {
  while (queue.length) {
    let slot = [...workers].find((entry) => !entry.closing && !entry.job);
    if (!slot && workers.size < MAX_WORKERS) {
      try {
        slot = createWorker();
      } catch {
        settle(queue.shift(), parserError("CV xidməti müvəqqəti əlçatan deyil.", 503, "CV_UNAVAILABLE"));
        continue;
      }
    }
    if (!slot) return;
    const job = queue.shift();
    slot.job = job;
    job.slot = slot;
    slot.worker.ref();
    // A private ArrayBuffer avoids transferring a pooled Node Buffer's backing
    // store, which can contain bytes belonging to other uploaded files.
    const data = job.buffer;
    job.buffer = null;
    try {
      slot.worker.postMessage({ data, filename: job.filename }, [data.buffer]);
    } catch {
      retireWorker(slot, parserError("CV xidməti müvəqqəti əlçatan deyil.", 503, "CV_UNAVAILABLE"));
    }
  }
}

async function extractCvTextFromBuffer(buffer, filename) {
  validateInput(buffer, filename);
  const available = [...workers].some((slot) => !slot.closing && !slot.job) || workers.size < MAX_WORKERS;
  if (!available && queue.length >= MAX_QUEUED_REQUESTS) {
    throw parserError("CV xidməti məşğuldur. Bir qədər sonra yenidən cəhd edin.", 503, "CV_QUEUE_FULL");
  }
  return new Promise((resolve, reject) => {
    // Protect queued input against later mutation by the caller.
    const job = { buffer: new Uint8Array(buffer), filename, resolve, reject, slot: null };
    job.timer = setTimeout(() => {
      const error = parserError("CV emalı vaxt həddini aşdı.", 504, "CV_PARSE_TIMEOUT");
      if (job.slot) retireWorker(job.slot, error);
      else {
        const index = queue.indexOf(job);
        if (index >= 0) queue.splice(index, 1);
        settle(job, error);
      }
    }, REQUEST_TIMEOUT_MS);
    queue.push(job);
    drainQueue();
  });
}

async function extractCvTextFromFile(filePath, filename) {
  const handle = await fs.open(filePath, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw parserError("CV faylı düzgün deyil.", 400, "INVALID_FILE");
    if (stat.size > MAX_FILE_SIZE) throw parserError("CV faylı 5 MB həddini aşır.", 413, "CV_TOO_LARGE");
    // Read at most the limit plus one byte even if the file grows after stat.
    const data = Buffer.alloc(Math.min(stat.size + 1, MAX_FILE_SIZE + 1));
    let length = 0;
    while (length < data.length) {
      const { bytesRead } = await handle.read(data, length, data.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > stat.size) throw parserError("CV faylı oxunarkən dəyişdirildi.", 400, "INVALID_FILE");
    return await extractCvTextFromBuffer(data.subarray(0, length), filename || path.basename(filePath));
  } finally {
    await handle.close();
  }
}

module.exports = { extractCvTextFromBuffer, extractCvTextFromFile };
