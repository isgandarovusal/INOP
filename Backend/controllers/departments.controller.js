const mongoose = require("mongoose");
const Department = require("../models/department.model");
const User = require("../models/user.model");
const Job = require("../models/job.model");
const Candidate = require("../models/candidate.model");
const Application = require("../models/application.model");
const { listRecords } = require("../utils/listQuery");
const { sendError } = require("../utils/sendError");
const { recordActivity } = require("../services/activityLog.service");

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function serializeDepartment(department) {
  const result = department.toObject ? department.toObject() : department;
  return { ...result, id: String(result._id) };
}

function scopedQuery(req, id) {
  return { $and: [{ _id: id }, req.dataScope || {}] };
}

exports.getDepartments = async (req, res) => {
  try {
    const query = {};

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const departments = await listRecords(Department, query, req, res, { sort: { name: 1, _id: 1 } });

    return res.status(200).json({
      departments: departments.map(serializeDepartment),
    });
  } catch (error) {
    return sendError(res, error, "Şöbələri yükləmək mümkün olmadı.");
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        message: "Şöbə ID-si düzgün deyil.",
      });
    }

    const query = scopedQuery(req, id);

    const department = await Department.findOne(query).lean();

    if (!department) {
      return res.status(404).json({
        message: "Şöbə tapılmadı.",
      });
    }

    return res.status(200).json({
      department: serializeDepartment(department),
    });
  } catch (error) {
    console.error("Get department error:", error?.name || "Error");
    return res.status(500).json({
      message: "Şöbəni yükləmək mümkün olmadı.",
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    if (req.permission?.scope === "department" || req.permission?.scope === "assigned") {
      return res.status(403).json({ message: "Bu məlumat səviyyəsində yeni şöbə yaratmaq olmaz." });
    }
    const name = clean(req.body.name);
    const description = clean(req.body.description);

    if (!name) {
      return res.status(400).json({
        message: "Şöbə adı tələb olunur.",
      });
    }

    const existing = await Department.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).lean();

    if (existing) {
      return res.status(409).json({
        message: "Bu adda şöbə artıq mövcuddur.",
      });
    }

    const department = await Department.create({
      name,
      description,
      createdBy: req.user.id,
    });

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "department",
        entityId: String(department._id),
        description: `Şöbə yaradıldı: ${department.name}`,
      });
    } catch (activityError) {
      console.error("Create department activity log error:", activityError?.name || "Error");
    }

    return res.status(201).json({
      message: "Şöbə uğurla yaradıldı.",
      department: serializeDepartment(department),
    });
  } catch (error) {
    console.error("Create department error:", error?.name || "Error");

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Şöbə məlumatları düzgün deyil." });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu adda şöbə artıq mövcuddur.",
      });
    }

    return res.status(500).json({
      message: "Şöbə yaratmaq mümkün olmadı.",
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        message: "Şöbə ID-si düzgün deyil.",
      });
    }

    const query = scopedQuery(req, id);

    const department = await Department.findOne(query);

    if (!department) {
      return res.status(404).json({
        message: "Şöbə tapılmadı.",
      });
    }

    if (req.body.name !== undefined) {
      const name = clean(req.body.name);

      if (!name) {
        return res.status(400).json({
          message: "Şöbə adı boş ola bilməz.",
        });
      }

      const duplicate = await Department.exists({
        _id: { $ne: id },
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      });
      if (duplicate) return res.status(409).json({ message: "Bu adda şöbə artıq mövcuddur." });

      department.name = name;
    }

    if (req.body.description !== undefined) {
      department.description = clean(req.body.description);
    }

    if (req.body.isActive !== undefined) {
      if (typeof req.body.isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive boolean olmalıdır.",
        });
      }

      department.isActive = req.body.isActive;
    }

    await department.save();

    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "department",
        entityId: String(department._id),
        description: `Şöbə yeniləndi: ${department.name}`,
      });
    } catch (activityError) {
      console.error("Update department activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json({
      message: "Şöbə uğurla yeniləndi.",
      department: serializeDepartment(department),
    });
  } catch (error) {
    console.error("Update department error:", error?.name || "Error");
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: "Şöbə məlumatları düzgün deyil." });
    }
    if (error.code === 11000) return res.status(409).json({ message: "Bu adda şöbə artıq mövcuddur." });

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Bu adda şöbə artıq mövcuddur.",
      });
    }

    return res.status(500).json({
      message: "Şöbəni yeniləmək mümkün olmadı.",
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        message: "Şöbə ID-si düzgün deyil.",
      });
    }

    const query = scopedQuery(req, id);
    const department = await Department.findOne(query);

    if (!department) {
      return res.status(404).json({
        message: "Şöbə tapılmadı.",
      });
    }

    const references = await Promise.all([User, Job, Candidate, Application].map((model) => model.exists({ departmentId: id })));
    if (references.some(Boolean)) {
      return res.status(409).json({ message: "İstifadəçiləri və ya işə qəbul qeydləri olan şöbə silinə bilməz." });
    }
    await department.deleteOne();

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "department",
        entityId: String(department._id),
        description: `Şöbə silindi: ${department.name}`,
      });
    } catch (activityError) {
      console.error("Delete department activity log error:", activityError?.name || "Error");
    }

    return res.status(200).json({
      message: "Şöbə uğurla silindi.",
    });
  } catch (error) {
    console.error("Delete department error:", error?.name || "Error");
    return res.status(500).json({
      message: "Şöbəni silmək mümkün olmadı.",
    });
  }
};
