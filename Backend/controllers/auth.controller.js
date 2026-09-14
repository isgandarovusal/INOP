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

function publicUser(user, permissions = []) {
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
    }).select("+password");

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
    const permissions = await getUserPermissions(user.role);

    return res.status(200).json({
      message: "Login uğurludur.",
      token,
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Auth login error:", error);

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

    const permissions = await getUserPermissions(user.role);

    return res.status(200).json({
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Auth me error:", error);

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
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Logout uğurla tamamlandı.",
    });
  } catch (error) {
    console.error("Auth logout error:", error);

    return res.status(500).json({
      message: "Logout zamanı server xətası baş verdi.",
    });
  }
};
