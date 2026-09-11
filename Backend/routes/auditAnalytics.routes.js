const express = require("express");

const router = express.Router();

const {
 getSummary,
 getByType,
 getTrend
} = require("../controllers/auditAnalytics.controller");


router.get(
 "/summary",
 getSummary
);


router.get(
 "/type",
 getByType
);


router.get(
 "/trend",
 getTrend
);


module.exports = router;
