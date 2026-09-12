const express = require("express");

const {
  getSummary,
  getByType,
  getTrend,
  getServiceAnalytics,
  getStandardAnalytics,
  getSafetyAnalytics,
} = require("../controllers/auditAnalytics.controller");

const { authorize } = require("../middleware/authorization.middleware");

const router = express.Router();

router.get(
  "/summary",
  ...authorize("audit.analytics", "read"),
  getSummary
);

router.get(
  "/type",
  ...authorize("audit.analytics", "read"),
  getByType
);

router.get(
  "/trend",
  ...authorize("audit.analytics", "read"),
  getTrend
);

router.get(
  "/service",
  ...authorize("audit.analytics", "read"),
  getServiceAnalytics
);

router.get(
  "/standard",
  ...authorize("audit.analytics", "read"),
  getStandardAnalytics
);

router.get(
  "/safety",
  ...authorize("audit.analytics", "read"),
  getSafetyAnalytics
);

module.exports = router;
