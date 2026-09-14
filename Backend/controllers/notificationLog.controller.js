const NotificationLog = require("../models/notificationLog.model");

function parseDate(value, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function buildQuery(req) {
  const query = { ...(req.dataScope || {}) };

  if (req.query.status) {
    query.status = String(req.query.status).trim().toLowerCase();
  }

  if (req.query.type) {
    query.type = String(req.query.type).trim();
  }

  if (req.query.recipient) {
    query.recipient = String(req.query.recipient).trim().toLowerCase();
  }

  const fromDate = parseDate(req.query.from);
  const toDate = parseDate(req.query.to, true);

  if (req.query.from && !fromDate) {
    const error = new Error("from tarixi düzgün deyil.");
    error.statusCode = 400;
    throw error;
  }

  if (req.query.to && !toDate) {
    const error = new Error("to tarixi düzgün deyil.");
    error.statusCode = 400;
    throw error;
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }

  return query;
}

exports.getNotificationLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const query = buildQuery(req);

    const [items, total] = await Promise.all([
      NotificationLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get notification logs error:", error);

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Notification log-ları alınarkən server xətası baş verdi.",
    });
  }
};

module.exports.buildQuery = buildQuery;
