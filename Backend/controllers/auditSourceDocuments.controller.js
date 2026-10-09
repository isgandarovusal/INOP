const path = require("path");
const { randomUUID } = require("node:crypto");
const AuditSourceDocument =
  require("../models/auditSourceDocument.model");
const { recordActivity } = require("../services/activityLog.service");


function normalizeDocument(doc) {
  if (!doc) return null;

  const item = doc.toObject
    ? doc.toObject()
    : doc;

  return {
    ...item,
    id: String(item._id || item.id),
    _id: undefined,
  };
}



exports.getDocuments = async (req, res) => {

  try {

    const filter = {};


    if (req.query.templateId) {
      filter.templateId = req.query.templateId;
    }


    if (req.query.brandId) {
      filter.brandId = req.query.brandId;
    }


    if (req.query.auditType) {
      filter.auditType = req.query.auditType;
    }


    const documents =
      await AuditSourceDocument
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();


    res.json(
      documents.map(normalizeDocument)
    );


  } catch(error) {

    console.error(
      "getDocuments error:",
      error
    );

    res.status(500).json({
      message:
        "Audit fayllarını yükləmək mümkün olmadı.",
    });

  }

};



exports.uploadDocument = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        message:
          "Fayl seçilməyib.",
      });
    }


    const {
      templateId = "",
      organizationId = "",
      brandId = "",
      auditType = "service",
    } = req.body;


    const document =
      await AuditSourceDocument.create({

        id:
          `source-${randomUUID()}`,

        templateId,

        organizationId,

        brandId,

        auditType,

        fileName:
          req.file.filename,

        name:
          req.file.originalname,

        originalName:
          req.file.originalname,

        mimeType:
          req.file.mimetype,

        size:
          req.file.size,

        storageKey:
          path.join(
            "uploads",
            req.file.filename
          ),

        filePath:
          req.file.path,

        status:
          "uploaded",

        uploadedBy: req.user.id,

      });

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "audit_source_document",
        entityId: document._id,
        description: `Audit source document yükləndi: ${document.originalName || document.name || document.id}`,
      });
    } catch (activityError) {
      console.error(
        "Audit source document activity log error:",
        activityError
      );
    }


    res.status(201).json(
      normalizeDocument(document)
    );


  } catch(error) {

    console.error(
      "uploadDocument error:",
      error
    );


    res.status(500).json({
      message:
        "Audit faylını saxlamaq mümkün olmadı.",
    });

  }

};



exports.deleteDocument = async(req,res)=>{

  try {

    const document =
      await AuditSourceDocument.findOneAndDelete({
        ...require("./privateFiles.controller").sourceQuery(req.params.id),
      });


    if(!document){

      return res.status(404).json({
        message:
          "Audit faylı tapılmadı.",
      });

    }

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "audit_source_document",
        entityId: document._id,
        description: `Audit source document silindi: ${document.originalName || document.name || document.id}`,
      });
    } catch (activityError) {
      console.error(
        "Audit source document activity log error:",
        activityError
      );
    }


    res.json({
      success:true,
      id:req.params.id,
    });


  } catch(error){

    console.error(error);

    res.status(500).json({
      message:
        "Delete error",
    });

  }

};
