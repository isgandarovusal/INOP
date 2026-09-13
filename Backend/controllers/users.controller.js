const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Role = require("../models/role.model");

function publicUser(user, permissions = []) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId || "",
    position: user.position || "",
    managerId: user.managerId ? String(user.managerId) : null,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions,
  };
}

async function getPermissions(roleKey) {
  const role = await Role.findOne({
    key: String(roleKey || "").toLowerCase(),
    isActive: true,
  })
    .select("permissions")
    .lean();

  return role?.permissions || [];
}

function validateObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

exports.getUsers = async (req, res) => {
  try {
    const query = {};

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const roleKeys = [...new Set(users.map((user) => user.role))];

    const roles = await Role.find({
      key: { $in: roleKeys },
      isActive: true,
    })
      .select("key permissions")
      .lean();

    const permissionsByRole = new Map(
      roles.map((role) => [role.key, role.permissions || []])
    );

    return res.status(200).json({
      users: users.map((user) =>
        publicUser(user, permissionsByRole.get(user.role) || [])
      ),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      message: "İstifadəçiləri yükləmək mümkün olmadı.",
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "İstifadəçi ID-si düzgün deyil.",
      });
    }

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const user = await User.findOne(query).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    const permissions = await getPermissions(user.role);

    return res.status(200).json({
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({
      message: "İstifadəçini yükləmək mümkün olmadı.",
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const name = normalizeString(req.body.name);
    const email = normalizeString(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string"
      ? req.body.password
      : "";
    const role = normalizeString(req.body.role).toLowerCase();
    const departmentId = normalizeString(req.body.departmentId);
    const position = normalizeString(req.body.position);

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Ad, email, şifrə və rol tələb olunur.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Şifrə ən azı 6 simvol olmalıdır.",
      });
    }

    const existing = await User.findOne({ email }).lean();

    if (existing) {
      return res.status(409).json({
        message: "Bu email ilə istifadəçi artıq mövcuddur.",
      });
    }

    const roleExists = await Role.findOne({
      key: role,
      isActive: true,
    }).lean();

    if (!roleExists) {
      return res.status(400).json({
        message: "Seçilmiş rol mövcud deyil.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      departmentId,
      position,
      createdBy: req.user.id,
    });

    const permissions = await getPermissions(user.role);

    return res.status(201).json({
      message: "İstifadəçi uğurla yaradıldı.",
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Create user error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu email ilə istifadəçi artıq mövcuddur.",
      });
    }

    return res.status(500).json({
      message: "İstifadəçi yaratmaq mümkün olmadı.",
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "İstifadəçi ID-si düzgün deyil.",
      });
    }

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "role",
      "departmentId",
      "position",
      "managerId",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "email") {
          user[field] = normalizeString(req.body[field]).toLowerCase();
        } else if (field === "role") {
          user[field] = normalizeString(req.body[field]).toLowerCase();
        } else {
          user[field] = req.body[field];
        }
      }
    }

    if (req.body.role !== undefined) {
      const roleExists = await Role.findOne({
        key: user.role,
        isActive: true,
      }).lean();

      if (!roleExists) {
        return res.status(400).json({
          message: "Seçilmiş rol mövcud deyil.",
        });
      }
    }

    if (req.body.password !== undefined) {
      if (
        typeof req.body.password !== "string" ||
        req.body.password.length < 6
      ) {
        return res.status(400).json({
          message: "Şifrə ən azı 6 simvol olmalıdır.",
        });
      }

      user.password = await bcrypt.hash(req.body.password, 12);
    }

    await user.save();

    const permissions = await getPermissions(user.role);

    return res.status(200).json({
      message: "İstifadəçi uğurla yeniləndi.",
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu email ilə istifadəçi artıq mövcuddur.",
      });
    }

    return res.status(500).json({
      message: "İstifadəçini yeniləmək mümkün olmadı.",
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "İstifadəçi ID-si düzgün deyil.",
      });
    }

    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive boolean olmalıdır.",
      });
    }

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const user = await User.findOneAndUpdate(
      query,
      { isActive: req.body.isActive },
      { new: true }
    )
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    const permissions = await getPermissions(user.role);

    return res.status(200).json({
      message: req.body.isActive
        ? "İstifadəçi aktivləşdirildi."
        : "İstifadəçi deaktiv edildi.",
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return res.status(500).json({
      message: "İstifadəçi statusunu dəyişmək mümkün olmadı.",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        message: "İstifadəçi ID-si düzgün deyil.",
      });
    }

    if (String(req.user.id) === String(id)) {
      return res.status(400).json({
        message: "Öz istifadəçinizi silə bilməzsiniz.",
      });
    }

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const user = await User.findOneAndDelete(query);

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    return res.status(200).json({
      message: "İstifadəçi uğurla silindi.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      message: "İstifadəçini silmək mümkün olmadı.",
    });
  }
};
