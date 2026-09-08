const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Keçidsiz sorğu: Token təmin edilməyib' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'inop_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Keçərsiz və ya vaxtı bitmiş token' });
  }
};

exports.checkRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Bu əməliyyat üçün yetərli icazəniz yoxdur' });
  }
  next();
};