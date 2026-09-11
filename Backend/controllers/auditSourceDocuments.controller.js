const path = require('path');
const AuditSourceDocument = require('../models/auditSourceDocument.model');

function normalizeDocument(doc) {
  if (!doc) return null;

  const item = doc.toObject ? doc.toObject() : doc;

  return {
    ...item,
    id: String(item._id),
    _id: undefined,
  };
}

exports.getDocuments = async (req, res) => {
  try {
    const filter = {};

    if (req.query.brandId) {
      filter.brandId = req.query.brandId;
    }

    if (req.query.auditType) {
      filter.auditType = req.query.auditType;
    }

    const documents = await AuditSourceDocument.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      documents.map((document) => ({
        ...document,
        id: String(document._id),
        _id: undefined,
      }))
    );
  } catch (error) {
    console.error('getDocuments error:', error);
    res.status(500).json({
      message: 'Audit fayllarını yükləmək mümkün olmadı.',
    });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Fayl seçilməyib.',
      });
    }

    const {
      organizationId = '',
      brandId = '',
      auditType,
      uploadedBy = '',
    } = req.body;

    if (!auditType) {
      return res.status(400).json({
        message: 'auditType tələb olunur.',
      });
    }

    const document = await AuditSourceDocument.create({
      organizationId,
      brandId,
      auditType,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageKey: path.join('uploads', req.file.filename),
      status: 'uploaded',
      uploadedBy,
    });

    res.status(201).json(normalizeDocument(document));
  } catch (error) {
    console.error('uploadDocument error:', error);
    res.status(500).json({
      message: 'Audit faylını saxlamaq mümkün olmadı.',
    });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await AuditSourceDocument.findByIdAndDelete(
      req.params.id
    );

    if (!document) {
      return res.status(404).json({
        message: 'Audit faylı tapılmadı.',
      });
    }

    res.json({
      message: 'Audit faylı silindi.',
      id: req.params.id,
    });
  } catch (error) {
    console.error('deleteDocument error:', error);
    res.status(500).json({
      message: 'Audit faylı silinə bilmədi.',
    });
  }
};
