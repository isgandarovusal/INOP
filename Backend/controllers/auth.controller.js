const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const RevokedToken = require("../models/revokedToken.model");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

async function publicUser(user) {
  // Independent fresh reads share one wait; neither is cached or skipped.
  const [permissions, auditProfile] = await Promise.all([
    getUserPermissions(user.role),
    require('../models/auditorProfile.model').findById(user._id).select('direction directions active organizationId').lean(),
  ]);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId || "",
    position: user.position || "",
    isActive: user.isActive,
    createdAt: user.createdAt,
    permissions,
    auditDirection: require('../services/auditDirection.service').profileDirections(auditProfile).length?auditProfile.direction:null,
    auditDirections: require('../services/auditDirection.service').profileDirections(auditProfile),
    hrAccess: require("../services/hrDepartmentAccess.service").isHRMember(user),
  };
}

async function getUserPermissions(roleKey) {
  const role = await Role.findOne({
    key: String(roleKey || "").toLowerCase(),
    isActive: true,
  })
    .select("permissions")
    .lean();

  return role?.permissions || [];
}

function createToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      email: user.email,
      jti: crypto.randomUUID(),
      cv: user.credentialVersion || 0,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    }
  );
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email və şifrə tələb olunur.",
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    }).select("+password +credentialVersion");

    if (!user) {
      return res.status(401).json({
        message: "Email və ya şifrə yanlışdır.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Bu hesab deaktiv edilib.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Email və ya şifrə yanlışdır.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login uğurludur.",
      token,
      user: await publicUser(user),
    });
  } catch (error) {
    require('../services/safeErrorLog.service').logFailure(error);

    return res.status(500).json({
      message: "Login zamanı server xətası baş verdi.",
    });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "İstifadəçi hesabı artıq aktiv deyil.",
      });
    }

    return res.status(200).json({
      user: await publicUser(user),
    });
  } catch (error) {
    require('../services/safeErrorLog.service').logFailure(error);

    return res.status(500).json({
      message: "İstifadəçi məlumatları alınarkən server xətası baş verdi.",
    });
  }
};


exports.logout = async (req, res) => {
  try {
    if (!req.authToken || !req.auth) {
      return res.status(401).json({
        message: "Authentication token tələb olunur.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(req.authToken)
      .digest("hex");

    const expiresAt = req.auth.exp
      ? new Date(req.auth.exp * 1000)
      : new Date(Date.now() + 8 * 60 * 60 * 1000);

    await RevokedToken.findOneAndUpdate(
      { tokenHash },
      {
        tokenHash,
        userId: req.user?.id || null,
        expiresAt,
      },
      { upsert: true, returnDocument: 'after' }
    );

    return res.status(200).json({
      message: "Logout uğurla tamamlandı.",
    });
  } catch (error) {
    require('../services/safeErrorLog.service').logFailure(error);

    return res.status(500).json({
      message: "Logout zamanı server xətası baş verdi.",
    });
  }
};

// Changes only the authenticated account; no target account can be supplied.
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' ||
        Buffer.byteLength(currentPassword, 'utf8') > 72 || Buffer.byteLength(newPassword, 'utf8') > 72 ||
        newPassword.length < 12 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || currentPassword === newPassword) {
      return res.status(400).json({ code: 'PASSWORD_INVALID', message: 'Yeni şifrə ən azı 12 simvol, hərf və rəqəmdən ibarət olmalıdır (maksimum 72 bayt).' });
    }
    const user = await User.findById(req.user.id).select('+password +credentialVersion');
    if (!user || !user.isActive || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ code: 'CURRENT_PASSWORD_INVALID', message: 'Cari şifrə düzgün deyil.' });
    }
    const password = await bcrypt.hash(newPassword, 12);
    // Compare-and-swap also rejects simultaneous attempts using the old password.
    const result = await User.updateOne({ _id: user._id, password: user.password }, { $set: { password }, $inc: { credentialVersion: 1 } });
    if (result.modifiedCount !== 1) return res.status(409).json({ code: 'PASSWORD_CHANGED', message: 'Şifrə artıq dəyişib. Yenidən daxil olun.' });
    return res.status(200).json({ message: 'Şifrə dəyişdirildi. Yenidən daxil olun.' });
  } catch (error) {
    require('../services/safeErrorLog.service').logFailure(error);
    return res.status(500).json({ message: 'Şifrəni dəyişmək mümkün olmadı.' });
  }
};
