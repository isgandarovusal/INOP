const MAX_LIMIT = 1000;

function parseListQuery(query = {}) {
  const integer = (value, fallback, maximum) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d+$/.test(value)) {
      const error = new Error("Pagination values must be positive integers.");
      error.status = 400;
      throw error;
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
      const error = new Error("Pagination value is outside the supported range.");
      error.status = 400;
      throw error;
    }
    return number;
  };
  const limit = integer(query.limit, MAX_LIMIT, MAX_LIMIT);
  const page = integer(query.page, 1, 10000);
  if ((page - 1) * limit > 100000) {
    const error = new Error("Pagination offset is too large.");
    error.status = 400;
    throw error;
  }
  return { limit, page, skip: (page - 1) * limit };
}

async function listRecords(Model, filter, req, res, options = {}) {
  const { limit, page, skip } = parseListQuery(req.query);
  const sort = options.sort || { createdAt: -1, _id: -1 };
  let query = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (options.select) query = query.select(options.select);
  for (const populate of options.populate || []) query = query.populate(populate);
  const [records, total] = await Promise.all([query.lean(), Model.countDocuments(filter)]);
  res.setHeader("X-Total-Count", String(total));
  if (skip + records.length < total) res.setHeader("X-Next-Page", String(page + 1));
  return records;
}

function searchFilter(query, fields) {
  if (query.search === undefined || query.search === "") return {};
  if (typeof query.search !== "string" || query.search.length > 100) {
    const error = new Error("Search must be text of at most 100 characters.");
    error.status = 400;
    throw error;
  }
  const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped ? { $or: fields.map((field) => ({ [field]: { $regex: escaped, $options: "i" } })) } : {};
}

module.exports = { parseListQuery, listRecords, searchFilter, MAX_LIMIT };
