const { auditError } = require('./auditTransaction.service');
function scalar(value, name) {
  if (value !== undefined && (typeof value !== 'string' || value.length > 128 || Array.from(value).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127))) throw auditError(400, `Invalid ${name}.`);
  return value;
}
function pagination(req, fallback = 50) {
  const q = req.query || {};
  const integer = (value, name, max, defaultValue) => {
    scalar(value, name);
    if (value === undefined) return defaultValue;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max) throw auditError(400, `Invalid ${name}.`);
    return Number(value);
  };
  const page = integer(q.page, 'page', 10000, 1), limit = integer(q.limit, 'limit', 200, fallback);
  return { page, limit, skip: (page - 1) * limit };
}
function dateRange(req) {
  const q = req.query || {}, dates = {};
  for (const key of ['dateFrom','dateTo']) {
    if (q[key] === undefined) continue;
    const value = scalar(q[key], key), date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw auditError(400, `Invalid ${key}.`);
    dates[key] = value;
  }
  if (dates.dateFrom && dates.dateTo && dates.dateFrom > dates.dateTo) throw auditError(400, 'Invalid date range.');
  return Object.keys(dates).length ? { date: { ...(dates.dateFrom ? {$gte:dates.dateFrom}:{}), ...(dates.dateTo ? {$lte:dates.dateTo}:{}) } } : {};
}
module.exports = { scalar, pagination, dateRange };
