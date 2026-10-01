const { parentPort, workerData } = require("worker_threads");
require("./cvParser.service")
  .extractCvTextFromBuffer(Buffer.from(workerData.buffer), workerData.filename)
  .then((text) => parentPort.postMessage({ text }))
  .catch((e) => parentPort.postMessage({ error: e.message }));
