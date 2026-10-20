const express = require("express");
const router = express.Router();

const {
  login,
  me,
  logout,
} = require("../controllers/auth.controller");

const {
  verifyToken,
} = require("../middleware/auth.middleware");

const rateLimit = require('express-rate-limit');
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  keyGenerator: req => req.user.id, message: { code: 'PASSWORD_RATE_LIMITED', message: 'Çoxlu cəhd. Bir qədər sonra yenidən cəhd edin.' } });
router.post('/change-password', verifyToken, passwordLimiter, require('../controllers/auth.controller').changePassword);
router.post("/login", login);
router.get("/me", verifyToken, me);
router.post("/logout", verifyToken, logout);

module.exports = router;
