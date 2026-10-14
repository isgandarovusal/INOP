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
    _id: undefined, filePath: undefined, storageKey: undefined, processingToken: undefined,
  };
}



exports.getDocuments = async (req, res) => {

  try {

    const filter = {archivedAt:null};
    const {scalar,pagination}=require('../services/auditQuery.service');const window=pagination(req);
    for(const key of ['templateId','brandId','auditType','organizationId'])scalar(req.query[key],key);
    if(req.query.brandId&&!require('../services/auditCatalog.service').brandIds.includes(req.query.brandId))throw Object.assign(new Error('Unknown brand.'),{status:400});
    if(req.query.organizationId && req.query.organizationId!=='gfc')throw Object.assign(new Error('Unknown organization.'),{status:400});
    if(req.query.organizationId)filter.organizationId=req.query.organizationId;
    const pageRequested=req.query.page!==undefined||req.query.limit!==undefined;


    if (req.query.templateId) {
      filter.templateId = req.query.templateId;
    }


    if (req.query.brandId) {
      filter.brandId = req.query.brandId;
    }


    if (req.query.auditType) {
      const direction=require('../services/auditDirection.service').canonicalDirection(req.query.auditType);if(!direction)throw Object.assign(new Error('Unknown direction.'),{status:400});filter.auditType={$in:require('../services/auditDirection.service').aliasesFor(direction)};
    }


    const documents =
      await AuditSourceDocument
        .find({ $and: [filter, req.auditCatalogFilter || {}] })
        .sort({
          createdAt: -1,
        })
        .skip(pageRequested?window.skip:0).limit(pageRequested?window.limit:0).maxTimeMS(5000).lean();


    res.json(
      documents.map(normalizeDocument)
    );


  } catch(error) {

    console.error(
      "getDocuments error:",
      error
    );

    res.status(error.status||500).json({
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


    const catalog=require('../services/auditCatalog.service');const direction=require('../services/auditDirection.service').canonicalDirection(auditType);
    if(!direction||(brandId&&!catalog.brandIds.includes(brandId))||(organizationId&&organizationId!=='gfc'))return res.status(400).json({message:'Unknown organization, brand or direction.'});
    const effectiveOrganization=organizationId||(brandId?'gfc':'');
    if(templateId){if(!require('mongoose').isObjectIdOrHexString(templateId))return res.status(400).json({message:'Invalid template.'});const template=await require('../models/auditTemplate.model').findOne({_id:templateId,...(effectiveOrganization?{organizationId:effectiveOrganization}:{}),...(brandId?{brandId}:{}),auditType:direction}).lean();if(!template||(template.organizationId&&!['gfc'].includes(template.organizationId)))return res.status(400).json({message:'Template does not match source scope.'});}
    const document =
      await AuditSourceDocument.create({

        id:
          `source-${randomUUID()}`,

        templateId,

        organizationId:effectiveOrganization,

        brandId,

        auditType:direction,

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


    res.status(error.status||500).json({
      message:
        "Audit faylını saxlamaq mümkün olmadı.",
    });

  }

};



exports.deleteDocument = async(req,res)=>{

  try {

    const document =
      await AuditSourceDocument.findOneAndUpdate({
        ...require("./privateFiles.controller").sourceQuery(req.params.id),archivedAt:null,...(req.auditCatalogFilter||{}),
      },{$set:{archivedAt:new Date(),archivedBy:req.user.id}},{returnDocument:"after"});


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

    res.status(error.status||500).json({
      message:
        "Delete error",
    });

  }

};
