const AuditTemplate = require('../models/auditTemplate.model');

function normalizeTemplate(doc) {
  if (!doc) return null;

  const item = doc.toObject ? doc.toObject() : doc;

  return {
    ...item,
    id: String(item._id),
    _id: undefined,
  };
}

exports.getTemplates = async (req, res) => {
  try {
    const filter = {};

    if (req.query.brandId) {
      filter.brandId = req.query.brandId;
    }

    if (req.query.auditType) {
      filter.auditType = req.query.auditType;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const templates = await AuditTemplate.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    res.json(
      templates.map((template) => ({
        ...template,
        id: String(template._id),
        _id: undefined,
      }))
    );
  } catch (error) {
    console.error('getTemplates error:', error);
    res.status(500).json({
      message: 'Audit template-ləri yükləmək mümkün olmadı.',
    });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await AuditTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        message: 'Audit template tapılmadı.',
      });
    }

    res.json(normalizeTemplate(template));
  } catch (error) {
    console.error('getTemplateById error:', error);
    res.status(500).json({
      message: 'Audit template yüklənə bilmədi.',
    });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const {
      organizationId = '',
      brandId = '',
      brandName,
      auditType,
      name,
      version = '1.0',
      status = 'draft',
      sections = [],
      sourceDocumentIds = [],
      createdBy = '',
    } = req.body;

    if (!brandName || !auditType || !name) {
      return res.status(400).json({
        message: 'brandName, auditType və name tələb olunur.',
      });
    }

    const template = await AuditTemplate.create({
      organizationId,
      brandId,
      brandName,
      auditType,
      name,
      version,
      status,
      sections,
      sourceDocumentIds,
      createdBy,
      updatedBy: createdBy,
    });

    res.status(201).json(normalizeTemplate(template));
  } catch (error) {
    console.error('createTemplate error:', error);
    res.status(500).json({
      message: 'Audit template yaratmaq mümkün olmadı.',
    });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const template = await AuditTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        message: 'Audit template tapılmadı.',
      });
    }

    const allowedFields = [
      'organizationId',
      'brandId',
      'brandName',
      'auditType',
      'name',
      'version',
      'status',
      'sections',
      'sourceDocumentIds',
      'updatedBy',
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        template[field] = req.body[field];
      }
    }

    await template.save();

    res.json(normalizeTemplate(template));
  } catch (error) {
    console.error('updateTemplate error:', error);
    res.status(500).json({
      message: 'Audit template yenilənə bilmədi.',
    });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await AuditTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        message: 'Audit template tapılmadı.',
      });
    }

    res.json({
      message: 'Audit template silindi.',
      id: req.params.id,
    });
  } catch (error) {
    console.error('deleteTemplate error:', error);
    res.status(500).json({
      message: 'Audit template silinə bilmədi.',
    });
  }
};
