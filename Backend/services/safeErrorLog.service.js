// Never serialize an Error: body-parser/Mongoose/provider errors can contain
// entire request bodies, documents, credentials, raw CV text or nested causes.
const multer = require('multer');
function safeStatus(error) {
  const value = Number(error?.statusCode || error?.status || 500);
  return Number.isInteger(value) && value >= 400 && value <= 599 ? value : 500;
}
function logFailure(error) {
  let category = 'internal', status = safeStatus(error);
  if (error instanceof multer.MulterError) { category = 'upload'; status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; }
  else if (error?.type === 'entity.parse.failed') { category = 'request_json'; status = 400; }
  else if (error?.type === 'entity.too.large') { category = 'request_size'; status = 413; }
  else if (error?.name === 'ValidationError') { category = 'validation'; status = 400; }
  else if (error?.name === 'CastError') { category = 'identifier'; status = 400; }
  else if (error?.code === 11000) { category = 'duplicate'; status = 409; }
  console.error('API failure:', { category, status });
}
module.exports = { logFailure, safeStatus };
