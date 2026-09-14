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

router.post("/login", login);
router.get("/me", verifyToken, me);
router.post("/logout", verifyToken, logout);

module.exports = router;
