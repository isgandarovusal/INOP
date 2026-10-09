const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
router.use(verifyToken);
router.get('/:filename', require('../controllers/privateFiles.controller').legacy);
module.exports = router;
