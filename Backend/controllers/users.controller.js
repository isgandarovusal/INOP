const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { recordActivity } = require("../services/activityLog.service");
const Role = require("../models/role.model");
const { unrestricted, canDelegate, privileged } = require("../services/authorizationPolicy.service");
const { mutateAdminSafely } = require("../services/adminInvariant.service");
const { validNewPassword, PASSWORD_REQUIREMENTS } = require("../utils/passwordPolicy");
const Department = require("../models/department.model");
const { listRecords, searchFilter } = require("../utils/listQuery");
const { sendError } = require("../utils/sendError");

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

function scopedUserQuery(req, id) {
  return { $and: [{ _id: id }, req.dataScope || {}] };
}

async function actorPermissions(req) {
  if (req.authRole) return req.authRole.permissions || [];
  return getPermissions(req.user.role);
}

async function checkUserAuthority(req, res, user, nextRole, departmentId, operation) {
  const permissions = await actorPermissions(req);
  const administrator = unrestricted(permissions);
  const self = user && String(user._id) === String(req.user.id);
  const destination = departmentId ?? user?.departmentId ?? "";
  if (req.permission?.scope === "department" && destination !== req.user.departmentId) {
    res.status(403).json({ message: "İstifadəçi yalnız öz şöbənizdə idarə edilə bilər." });
    return false;
  }
  if (!administrator) {
    const currentRole = user ? await Role.findOne({ key: user.role }).select("permissions").lean() : null;
    if ((user && (!currentRole || user.role === "admin")) || (user && privileged(currentRole.permissions) && !self)) {
      res.status(403).json({ message: "Bu istifadəçini yalnız administrator idarə edə bilər." });
      return false;
    }
    if (self && (operation !== "update" ||
        (nextRole && nextRole.key !== user.role) || destination !== (user.departmentId || "") ||
        (req.body.managerId !== undefined && String(req.body.managerId || "") !== String(user.managerId || "")))) {
      res.status(403).json({ message: "Öz rolunuzu və məlumat səviyyənizi dəyişə bilməzsiniz." });
      return false;
    }
    if (nextRole && (!user || nextRole.key !== user.role) &&
        (privileged(nextRole.permissions) || !canDelegate(permissions, nextRole.permissions))) {
      res.status(403).json({ message: "Bu rolu təyin etmək üçün kifayət qədər icazəniz yoxdur." });
      return false;
    }
    if (!user && req.permission?.scope === "own") {
      res.status(403).json({ message: "Bu məlumat səviyyəsində yeni istifadəçi yaratmaq olmaz." });
      return false;
    }
  }
  const removesAdmin = user?.role === "admin" && user.isActive &&
    (operation === "delete" || (operation === "status" && req.body.isActive === false) ||
     (nextRole && nextRole.key !== "admin"));
  if (removesAdmin && !await User.exists({ role: "admin", isActive: true, _id: { $ne: user._id } })) {
    res.status(409).json({ message: "Son aktiv administrator silinə və ya deaktiv edilə bilməz." });
    return false;
  }
  return true;
}

async function validateManager(req, res, managerId, userId, departmentId) {
  if (managerId == null || managerId === "") return true;
  if (typeof managerId !== "string" || !validateObjectId(managerId) || String(managerId) === String(userId)) {
    res.status(400).json({ message: "Rəhbər ID-si düzgün deyil." });
    return false;
  }
  const manager = await User.findOne({ _id: managerId, isActive: true }).select("departmentId").lean();
  if (!manager || (!unrestricted(await actorPermissions(req)) && manager.departmentId !== departmentId)) {
    res.status(400).json({ message: "Aktiv və uyğun şöbədə olan rəhbər seçilməlidir." });
    return false;
  }
  return true;
}

async function validateDepartment(res, departmentId, currentDepartmentId, rolePermissions) {
  if (!departmentId) {
    if ((rolePermissions || []).some((permission) => permission.scope === "department")) {
      res.status(400).json({ message: "Bu rol üçün aktiv şöbə seçilməlidir." });
      return false;
    }
    return true;
  }
  // Preserve unchanged legacy department identifiers while allowing an admin
  // to repair them. All newly selected departments must resolve to real records.
  if (currentDepartmentId !== undefined && departmentId === currentDepartmentId) return true;
  if (!validateObjectId(departmentId) || !await Department.exists({ _id: departmentId, isActive: true })) {
    res.status(400).json({ message: "Aktiv və mövcud şöbə seçilməlidir." });
    return false;
  }
  return true;
}

exports.getUsers = async (req, res) => {
  try {
    const query = { $and: [req.dataScope || {}, searchFilter(req.query || {}, ["name", "email", "position"])] };
    const users = await listRecords(User, query, req, res, { select: "-password" });

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
    return sendError(res, error, "İstifadəçiləri yükləmək mümkün olmadı.");
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

    const query = scopedUserQuery(req, id);

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
    console.error("Get user error:", error?.name || "Error");
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

    if (!validNewPassword(password)) {
      return res.status(400).json({
        message: PASSWORD_REQUIREMENTS,
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
    })
      .select("key permissions")
      .lean();

    if (!roleExists) {
      return res.status(400).json({
        message: "Seçilmiş rol mövcud deyil.",
      });
    }

    if (!await checkUserAuthority(req, res, null, roleExists, departmentId, "create")) return;
    if (!await validateDepartment(res, departmentId, undefined, roleExists.permissions)) return;
    const managerId = req.permission?.scope === "assigned" ? req.user.id : (req.body.managerId || null);
    if (!await validateManager(req, res, managerId, null, departmentId)) return;

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      departmentId,
      position,
      managerId,
      createdBy: req.user.id,
    });

    const permissions = roleExists.permissions || [];

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "user",
        entityId: String(user._id),
        description: `İstifadəçi yaradıldı: ${user.name} (${user.email})`,
      });
    } catch (activityError) {
      console.error("Create user activity log error:", activityError?.name || "Error");
    }

    return res.status(201).json({
      message: "İstifadəçi uğurla yaradıldı.",
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Create user error:", error?.name || "Error");

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "İstifadəçi məlumatları düzgün deyil." });
    }

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

    const query = scopedUserQuery(req, id);
    const user = await User.findOne(query).select("+tokenVersion");

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    let selectedRole = null;
    if (req.body.role !== undefined) {
      selectedRole = await Role.findOne({ key: normalizeString(req.body.role).toLowerCase(), isActive: true })
        .select("key permissions").lean();
      if (!selectedRole) return res.status(400).json({ message: "Seçilmiş rol mövcud deyil." });
    }
    const destination = req.body.departmentId === undefined ? (user.departmentId || "") : normalizeString(req.body.departmentId);
    if (!await checkUserAuthority(req, res, user, selectedRole, destination, "update")) return;
    if (!await validateDepartment(res, destination, user.departmentId || "", selectedRole?.permissions || await getPermissions(user.role))) return;
    if (req.body.managerId !== undefined && !await validateManager(req, res, req.body.managerId, id, destination)) return;
    if (req.permission?.scope === "assigned" && req.body.managerId !== undefined && req.body.managerId !== req.user.id) {
      return res.status(403).json({ message: "İstifadəçini öz məlumat səviyyənizdən çıxara bilməzsiniz." });
    }
    const originalRole = user.role;
    const wasActive = user.isActive;
    const originalEmail = user.email;

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
        } else if (field === "managerId") {
          user[field] = req.body[field] || null;
        } else {
          user[field] = normalizeString(req.body[field]);
        }
      }
    }

    if (req.body.password !== undefined) {
      if (!validNewPassword(req.body.password)) {
        return res.status(400).json({
          message: PASSWORD_REQUIREMENTS,
        });
      }

      user.password = await bcrypt.hash(req.body.password, 12);
    }

    if (req.body.password !== undefined || user.role !== originalRole || user.email !== originalEmail) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await mutateAdminSafely(user, originalRole === "admin" && wasActive && user.role !== "admin", () => user.save({ maxTimeMS: 5000 }));

    const permissions =
      req.body.role !== undefined
        ? selectedRole.permissions || []
        : await getPermissions(user.role);

    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "user",
        entityId: String(user._id),
        description: `İstifadəçi yeniləndi: ${user.name} (${user.email})`,
      });
    } catch (activityError) {
      console.error("Update user activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json({
      message: "İstifadəçi uğurla yeniləndi.",
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Update user error:", error?.name || "Error");

    if (error.name === "VersionError") return res.status(409).json({ message: "İstifadəçi başqa əməliyyatda yeniləndi. Yenidən yükləyin." });
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "İstifadəçi məlumatları düzgün deyil." });
    }

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

    const query = scopedUserQuery(req, id);
    const user = await User.findOne(query).select("+tokenVersion");

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    if (!await checkUserAuthority(req, res, user, null, undefined, "status")) return;
    if (user.isActive !== req.body.isActive) user.tokenVersion = (user.tokenVersion || 0) + 1;
    const removesAdmin = user.role === "admin" && user.isActive && !req.body.isActive;
    user.isActive = req.body.isActive;
    await mutateAdminSafely(user, removesAdmin, () => user.save({ maxTimeMS: 5000 }));

    const permissions = await getPermissions(user.role);

    try {
      await recordActivity({
        req,
        action: user.isActive ? "activate" : "deactivate",
        entityType: "user",
        entityId: String(user._id),
        description: user.isActive
          ? `İstifadəçi aktivləşdirildi: ${user.name} (${user.email})`
          : `İstifadəçi deaktiv edildi: ${user.name} (${user.email})`,
      });
    } catch (activityError) {
      console.error("Update user status activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json({
      message: req.body.isActive
        ? "İstifadəçi aktivləşdirildi."
        : "İstifadəçi deaktiv edildi.",
      user: publicUser(user, permissions),
    });
  } catch (error) {
    console.error("Update user status error:", error?.name || "Error");
    if (error.name === "VersionError") return res.status(409).json({ message: "İstifadəçi başqa əməliyyatda yeniləndi. Yenidən yükləyin." });
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
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

    const query = scopedUserQuery(req, id);
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        message: "İstifadəçi tapılmadı.",
      });
    }

    if (!await checkUserAuthority(req, res, user, null, undefined, "delete")) return;
    await mutateAdminSafely(user, user.role === "admin" && user.isActive, () => user.deleteOne());

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "user",
        entityId: String(user._id),
        description: `İstifadəçi silindi: ${user.name} (${user.email})`,
      });
    } catch (activityError) {
      console.error("Delete user activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json({
      message: "İstifadəçi uğurla silindi.",
    });
  } catch (error) {
    console.error("Delete user error:", error?.name || "Error");
    if (error.statusCode === 409) return res.status(409).json({ message: error.message });
    return res.status(500).json({
      message: "İstifadəçini silmək mümkün olmadı.",
    });
  }
};
