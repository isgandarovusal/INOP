const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Role = require("../models/role.model");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return secret;
}

exports.verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token tələb olunur.",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication token tələb olunur.",
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.id)
      .select(
        "_id name email role departmentId position managerId isActive"
      )
      .lean();

    if (!user) {
      return res.status(401).json({
        message: "İstifadəçi hesabı tapılmadı.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Bu istifadəçi hesabı deaktiv edilib.",
      });
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || "",
      position: user.position || "",
      managerId: user.managerId
        ? String(user.managerId)
        : null,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Authentication token vaxtı bitib.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Authentication token keçərsizdir.",
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Authentication zamanı server xətası baş verdi.",
    });
  }
};

async function getRole(roleKey) {
  return Role.findOne({
    key: String(roleKey || "").toLowerCase(),
    isActive: true,
  }).lean();
}

function permissionMatches(permission, resource, action) {
  const resourceMatches =
    permission.resource === "*" ||
    permission.resource === resource;

  const actionMatches =
    permission.action === "*" ||
    permission.action === action;

  return resourceMatches && actionMatches;
}

function getPermissionScope(permissions, resource, action) {
  const matchedPermission = permissions.find((permission) =>
    permissionMatches(permission, resource, action)
  );

  return matchedPermission?.scope || null;
}

exports.requirePermission = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication tələb olunur.",
      });
    }

    try {
      const role = await getRole(req.user.role);

      if (!role) {
        return res.status(403).json({
          message:
            "İstifadəçi rolu aktiv deyil və ya mövcud deyil.",
        });
      }

      const scope = getPermissionScope(
        role.permissions || [],
        resource,
        action
      );

      if (!scope) {
        return res.status(403).json({
          message:
            "Bu əməliyyat üçün kifayət qədər icazəniz yoxdur.",
          requiredPermission: `${resource}.${action}`,
        });
      }

      req.permission = {
        resource,
        action,
        scope,
      };

      next();
    } catch (error) {
      console.error("Permission check error:", error);

      return res.status(500).json({
        message:
          "Authorization yoxlanılarkən server xətası baş verdi.",
      });
    }
  };
};

exports.requireAnyPermission = (permissions) => {
  const requiredPermissions = Array.isArray(permissions)
    ? permissions
    : [];

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication tələb olunur.",
      });
    }

    try {
      const role = await getRole(req.user.role);

      if (!role) {
        return res.status(403).json({
          message:
            "İstifadəçi rolu aktiv deyil və ya mövcud deyil.",
        });
      }

      for (const permission of requiredPermissions) {
        if (
          !permission ||
          typeof permission !== "string" ||
          !permission.includes(".")
        ) {
          continue;
        }

        const parts = permission.split(".");
        const action = parts.pop();
        const resource = parts.join(".");

        if (!resource || !action) {
          continue;
        }

        const scope = getPermissionScope(
          role.permissions || [],
          resource,
          action
        );

        if (scope) {
          req.permission = {
            resource,
            action,
            scope,
          };

          return next();
        }
      }

      return res.status(403).json({
        message:
          "Bu əməliyyat üçün kifayət qədər icazəniz yoxdur.",
      });
    } catch (error) {
      console.error("Permission check error:", error);

      return res.status(500).json({
        message:
          "Authorization yoxlanılarkən server xətası baş verdi.",
      });
    }
  };
};

exports.getRolePermissions = async (roleKey) => {
  const role = await getRole(roleKey);
  return role?.permissions || [];
};

exports.getPermissionScope = async (
  roleKey,
  resource,
  action
) => {
  const role = await getRole(roleKey);

  if (!role) {
    return null;
  }

  return getPermissionScope(
    role.permissions || [],
    resource,
    action
  );
};
