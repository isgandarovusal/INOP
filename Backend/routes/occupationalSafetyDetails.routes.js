const express = require("express");

const router = express.Router();

const {
  getSafetyDetails,
  updateSafetyDetails,
} = require("../controllers/occupationalSafetyDetails.controller");

router.get("/:id/details", getSafetyDetails);

router.patch("/:id/details", updateSafetyDetails);

module.exports = router;
