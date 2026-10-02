const mongoose = require("mongoose");
const Role = require("../models/role.model");
const User = require("../models/user.model");

const VALID_SCOPES = new Set([
  "all",
  "department",
  "assigned",
  "own",
  "none",
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizePermissions(value) {
  if (!Array.isArray(value)) {
    return {
      error: "permissions array olmalıdır.",
    };
  }

  const normalized = [];
  const seen = new Set();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return {
        error: "Hər permission obyekt olmalıdır.",
      };
    }

    const resource = normalizeString(item.resource).toLowerCase();
    const action = normalizeString(item.action).toLowerCase();
    const scope = normalizeString(item.scope || "all").toLowerCase();

    if (!resource || !action) {
      return {
        error: "Permission üçün resource və action tələb olunur.",
      };
    }

    if (!VALID_SCOPES.has(scope)) {
      return {
        error:
          "Permission scope yalnız all, department, assigned, own və ya none ola bilər.",
      };
    }

    const permissionKey = `${resource}:${action}:${scope}`;

    if (seen.has(permissionKey)) {
      continue;
    }

    seen.add(permissionKey);

    normalized.push({
      resource,
      action,
      scope,
    });
  }

  return {
    permissions: normalized,
  };
}

function serializeRole(role, userCount = 0) {
  return {
    id: String(role._id),
    name: role.name,
    key: role.key,
    description: role.description || "",
    permissions: role.permissions || [],
    isSystemRole: Boolean(role.isSystemRole),
    isActive: Boolean(role.isActive),
    userCount,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function getUserCounts() {
  const counts = await User.aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    counts.map((item) => [String(item._id), item.count])
  );
}

exports.getRoles = async (req, res) => {
  try {
    const [roles, userCounts] = await Promise.all([
      Role.find({})
        .sort({ isSystemRole: -1, name: 1 })
        .lean(),
      getUserCounts(),
    ]);

    return res.status(200).json({
      roles: roles.map((role) =>
        serializeRole(role, userCounts.get(role.key) || 0)
      ),
    });
  } catch (error) {
    console.error("Get roles error:", error);

    return res.status(500).json({
      message: "Rolları yükləmək mümkün olmadı.",
    });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "Rol ID-si düzgün deyil.",
      });
    }

    const role = await Role.findById(id).lean();

    if (!role) {
      return res.status(404).json({
        message: "Rol tapılmadı.",
      });
    }

    const userCount = await User.countDocuments({
      role: role.key,
    });

    return res.status(200).json({
      role: serializeRole(role, userCount),
    });
  } catch (error) {
    console.error("Get role error:", error);

    return res.status(500).json({
      message: "Rolu yükləmək mümkün olmadı.",
    });
  }
};

exports.createRole = async (req, res) => {
  try {
    const name = normalizeString(req.body.name);
    const key = normalizeKey(req.body.key);
    const description = normalizeString(req.body.description);

    if (!name || !key) {
      return res.status(400).json({
        message: "Rol adı və key tələb olunur.",
      });
    }

    const permissionResult = normalizePermissions(
      req.body.permissions || []
    );

    if (permissionResult.error) {
      return res.status(400).json({
        message: permissionResult.error,
      });
    }

    const existing = await Role.findOne({ key }).lean();

    if (existing) {
      return res.status(409).json({
        message: "Bu key ilə rol artıq mövcuddur.",
      });
    }

    const role = await Role.create({
      name,
      key,
      description,
      permissions: permissionResult.permissions,
      isSystemRole: false,
      isActive: true,
    });

    return res.status(201).json({
      message: "Rol uğurla yaradıldı.",
      role: serializeRole(role, 0),
    });
  } catch (error) {
    console.error("Create role error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu key ilə rol artıq mövcuddur.",
      });
    }

    return res.status(500).json({
      message: "Rol yaratmaq mümkün olmadı.",
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "Rol ID-si düzgün deyil.",
      });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        message: "Rol tapılmadı.",
      });
    }

    if (req.body.name !== undefined) {
      const name = normalizeString(req.body.name);

      if (!name) {
        return res.status(400).json({
          message: "Rol adı boş ola bilməz.",
        });
      }

      role.name = name;
    }

    if (req.body.description !== undefined) {
      role.description = normalizeString(req.body.description);
    }

    if (req.body.key !== undefined) {
      const requestedKey = normalizeKey(req.body.key);

      if (!requestedKey) {
        return res.status(400).json({
          message: "Rol key boş ola bilməz.",
        });
      }

      if (role.isSystemRole && requestedKey !== role.key) {
        return res.status(400).json({
          message: "Sistem rolunun key-i dəyişdirilə bilməz.",
        });
      }

      if (requestedKey !== role.key) {
        const existing = await Role.findOne({
          key: requestedKey,
          _id: { $ne: role._id },
        }).lean();

        if (existing) {
          return res.status(409).json({
            message: "Bu key ilə rol artıq mövcuddur.",
          });
        }

        role.key = requestedKey;
      }
    }

    if (req.body.permissions !== undefined) {
      const permissionResult = normalizePermissions(
        req.body.permissions
      );

      if (permissionResult.error) {
        return res.status(400).json({
          message: permissionResult.error,
        });
      }

      role.permissions = permissionResult.permissions;
    }

    await role.save();

    const userCount = await User.countDocuments({
      role: role.key,
    });

    return res.status(200).json({
      message: "Rol uğurla yeniləndi.",
      role: serializeRole(role, userCount),
    });
  } catch (error) {
    console.error("Update role error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu key ilə rol artıq mövcuddur.",
      });
    }

    return res.status(500).json({
      message: "Rolu yeniləmək mümkün olmadı.",
    });
  }
};

exports.updateRoleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "Rol ID-si düzgün deyil.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive boolean olmalıdır.",
      });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        message: "Rol tapılmadı.",
      });
    }

    if (!req.body.isActive && role.isSystemRole) {
      return res.status(400).json({
        message: "Sistem rolu deaktiv edilə bilməz.",
      });
    }

    if (!req.body.isActive) {
      const userCount = await User.countDocuments({
        role: role.key,
      });

      if (userCount > 0) {
        return res.status(409).json({
          message:
            "İstifadəçilərə təyin olunmuş rol deaktiv edilə bilməz.",
        });
      }
    }

    role.isActive = req.body.isActive;
    await role.save();

    const userCount = await User.countDocuments({
      role: role.key,
    });

    return res.status(200).json({
      message: role.isActive
        ? "Rol aktivləşdirildi."
        : "Rol deaktiv edildi.",
      role: serializeRole(role, userCount),
    });
  } catch (error) {
    console.error("Update role status error:", error);

    return res.status(500).json({
      message: "Rol statusunu dəyişmək mümkün olmadı.",
    });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "Rol ID-si düzgün deyil.",
      });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        message: "Rol tapılmadı.",
      });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        message: "Sistem rolu silinə bilməz.",
      });
    }

    const userCount = await User.countDocuments({
      role: role.key,
    });

    if (userCount > 0) {
      return res.status(409).json({
        message:
          "İstifadəçilərə təyin olunmuş rol silinə bilməz.",
      });
    }

    await role.deleteOne();

    return res.status(200).json({
      message: "Rol uğurla silindi.",
      role: {
        id: String(role._id),
        key: role.key,
      },
    });
  } catch (error) {
    console.error("Delete role error:", error);

    return res.status(500).json({
      message: "Rolu silmək mümkün olmadı.",
    });
  }
};
