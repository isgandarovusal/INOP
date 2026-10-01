module.exports = (req, res, next) => {
  const page = Number(req.query.page || 1),
    limit = Number(req.query.limit || 100);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return res
      .status(400)
      .json({ message: "page must be positive and limit between 1 and 100" });
  req.pageLimit = limit;
  req.pageOffset = (page - 1) * limit;
  res.set("X-Page", String(page));
  res.set("X-Page-Limit", String(limit));
  next();
};
