const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const bytes = Buffer.from(workerData.bytes);
  if (workerData.operation === 'validate') {
    const { validContent } = require('./uploadContent.service');
    parentPort.postMessage({ ok: true, value: validContent(bytes, workerData.filename) });
  } else if (['extract', 'parse'].includes(workerData.operation)) {
    const { extractCvResult } = require('./cvTextExtraction.service');
    const value = await extractCvResult(bytes, workerData.filename);
    if (workerData.operation === 'parse') {
      value.parsed = value.text ? require('./cvStructuredParser.service').parseStructuredCv(value.text) : null;
      if (value.parsed) value.parsed.extraction.warnings.push(...value.warnings);
    }
    parentPort.postMessage({ ok: true, value });
  } else parentPort.postMessage({ ok: false, code: 'DOCUMENT_INVALID' });
})().catch(() => parentPort.postMessage({ ok: false, code: 'DOCUMENT_WORKER_FAILED' }));
