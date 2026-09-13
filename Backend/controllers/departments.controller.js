const mongoose = require("mongoose");
const Department = require("../models/department.model");

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

exports.getDepartments = async (req, res) => {
  try {
    const query = {};

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const departments = await Department.find(query)
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);
    return res.status(500).json({
      message: "Şöbələri yükləmək mümkün olmadı.",
    });
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

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const department = await Department.findOne(query).lean();

    if (!department) {
      return res.status(404).json({
        message: "Şöbə tapılmadı.",
      });
    }

    return res.status(200).json({
      department,
    });
  } catch (error) {
    console.error("Get department error:", error);
    return res.status(500).json({
      message: "Şöbəni yükləmək mümkün olmadı.",
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
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

    return res.status(201).json({
      message: "Şöbə uğurla yaradıldı.",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);

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

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

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

    return res.status(200).json({
      message: "Şöbə uğurla yeniləndi.",
      department,
    });
  } catch (error) {
    console.error("Update department error:", error);

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

    const query = { _id: id };

    if (req.dataScope && Object.keys(req.dataScope).length > 0) {
      Object.assign(query, req.dataScope);
    }

    const department = await Department.findOneAndDelete(query);

    if (!department) {
      return res.status(404).json({
        message: "Şöbə tapılmadı.",
      });
    }

    return res.status(200).json({
      message: "Şöbə uğurla silindi.",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    return res.status(500).json({
      message: "Şöbəni silmək mümkün olmadı.",
    });
  }
};
