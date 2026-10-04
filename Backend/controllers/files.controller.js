const path = require("path");
const fs = require("fs/promises");
const { uploadsDir } = require("../middleware/privateUpload.middleware");
const {
  getUserPermissionScope,
} = require("../middleware/authorization.middleware");
const { getDataScope } = require("../middleware/dataScope.middleware");
const {
  getAssignedAuditFilter,
} = require("../middleware/auditScope.middleware");
const Candidate = require("../models/candidate.model");
const Audit = require("../models/audit.model");
const Document = require("../models/auditSourceDocument.model");
async function scope(req, resource) {
  const level = await getUserPermissionScope(req.user.role, resource, "read");
  return level ? { ...req, permission: { scope: level } } : null;
}
exports.download = async (req, res, next) => {
  try {
    const name = req.params.name;
    if (name !== path.basename(name)) return res.sendStatus(400);
    const url = "/uploads/" + name;
    let allowed = false;
    const c = await scope(req, "candidate");
    if (c) {
      const filter = getDataScope(c);
      if (filter)
        allowed = Boolean(await Candidate.exists({ ...filter, cvUrl: url }));
    }
    if (!allowed) {
      const a = await scope(req, "audit");
      if (a) {
        const filter = await getAssignedAuditFilter(a);
        if (filter)
          allowed = Boolean(
            await Audit.exists({
              $and: [
                filter,
                {
                  $or: [
                    { "photos.blobUrl": url },
                    { "attachments.blobUrl": url },
                  ],
                },
              ],
            }),
          );
      }
    }
    if (!allowed) {
      const d = await scope(req, "audit.source_document");
      if (d) {
        const filter =
          d.permission.scope === "all" ? {} : { uploadedBy: req.user.id };
        allowed = Boolean(await Document.exists({ ...filter, fileName: name }));
      }
    }
    if (!allowed)
      return res
        .status(404)
        .json({ message: "File not found or access denied." });
    res.set("Cache-Control", "private, no-store");
    res.download(path.join(uploadsDir, name), name, (e) => {
      if (e && !res.headersSent) next(e);
    });
  } catch (e) {
    next(e);
  }
};
exports.cleanup = async (url) => {
  if (!url?.startsWith("/uploads/")) return;
  const name = path.basename(url);
  if (
    (await Candidate.exists({ cvUrl: url })) ||
    (await Audit.exists({
      $or: [{ "photos.blobUrl": url }, { "attachments.blobUrl": url }],
    })) ||
    (await Document.exists({ fileName: name }))
  )
    return;
  await fs.unlink(path.join(uploadsDir, name)).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
};
exports.replaceCv = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CV required" });
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, ...req.dataScope },
      { $set: { cvUrl: "/uploads/" + req.file.filename } },
      { new: false },
    );
    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });
    await exports.cleanup(candidate.cvUrl);
    res.json({ cvUrl: "/uploads/" + req.file.filename });
  } catch (e) {
    next(e);
  }
};
exports.addEvidence = async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length)
      return res.status(400).json({ message: "Files required" });
    const field = req.body.kind === "photos" ? "photos" : "attachments";
    const items = files.map((f) => ({
      name: f.originalname,
      size: f.size,
      blobUrl: "/uploads/" + f.filename,
    }));
    const audit = await require("../services/auditMutation.service").mutate(
      req,
      "evidence",
      "created",
      async (session, a) => {
        a[field].push(...items);
        await a.save({ session });
        return a;
      },
    );
    if (!audit)
      return res
        .status(409)
        .json({ message: "Closed audit cannot be edited." });
    res.status(201).json(audit);
  } catch (e) {
    next(e);
  }
};
