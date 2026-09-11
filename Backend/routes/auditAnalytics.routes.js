const express = require("express");

const {
  getSummary,
  getByType,
  getTrend,
  getServiceAnalytics,
  getStandardAnalytics,
  getSafetyAnalytics,
} = require("../controllers/auditAnalytics.controller");

const router = express.Router();

router.get("/summary", getSummary);
router.get("/type", getByType);
router.get("/trend", getTrend);

router.get("/service", getServiceAnalytics);
router.get("/standard", getStandardAnalytics);
router.get("/safety", getSafetyAnalytics);

module.exports = router;
