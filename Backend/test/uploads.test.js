const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const JSZip = require("jszip");
const Role = require("../models/role.model");
const Candidate = require("../models/candidate.model");
const Source = require("../models/auditSourceDocument.model");
const Template = require("../models/auditTemplate.model");
const {
  isSafeFilename, ensureUploadsDirectory, openStoredFile, removeStoredFile,
  uploadsDir, validateFileContent,
} = require("../services/fileStorage.service");
const { scopeFilter, identifierFilter } = require("../services/auditLibrary.service");
const { templateInput } = require("../services/auditTemplateValidation.service");
const { uploadMiddleware, canReadStoredFile, getUploadedFile } = require("../middleware/uploads.middleware");
const sourceController = require("../controllers/auditSourceDocuments.controller");
const templateController = require("../controllers/auditTemplates.controller");
const PDF = Buffer.from("%PDF-1.7\nfixture\n%%EOF");
const USER_ID = "507f1f77bcf86cd799439011";

function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

async function serve(t, app) {
  const server = await new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function multipart(buffer, name = "cv.pdf", type = "application/pdf") {
  const form = new FormData();
  form.append("cv", new Blob([buffer], { type }), name);
  return form;
}

test("storage filenames reject traversal, separators and control characters", () => {
  for (const name of ["../.env", "..", ".", "a/b.pdf", "a\\b.pdf", "x\n.pdf", "x\0.pdf", ""]) assert.equal(isSafeFilename(name), false);
  assert.equal(isSafeFilename("a-document.pdf"), true);
});

test("stored-file reads reject symlink escapes; deletion cannot delete the target", async (t) => {
  await ensureUploadsDirectory();
  const target = path.join("/tmp", `inop-private-${crypto.randomUUID()}`);
  const filename = `${crypto.randomUUID()}.pdf`;
  const link = path.join(uploadsDir, filename);
  await fs.writeFile(target, "secret");
  await fs.symlink(target, link);
  t.after(async () => { await fs.rm(target, { force: true }); await fs.rm(link, { force: true }); });
  await assert.rejects(openStoredFile(filename), { code: "ELOOP" });
  await removeStoredFile(filename);
  assert.equal(await fs.readFile(target, "utf8"), "secret");
});

test("document validation checks format and rejects oversized ZIP expansion", async () => {
  assert.equal(validateFileContent(PDF, "cv.pdf"), "application/pdf");
  assert.throws(() => validateFileContent(Buffer.from("<script>alert(1)</script>"), "cv.pdf"), /not a PDF/);
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types />");
  zip.file("word/document.xml", "<document />");
  assert.match(validateFileContent(await zip.generateAsync({ type: "nodebuffer" }), "cv.docx"), /wordprocessingml/);
  assert.throws(() => validateFileContent(Buffer.from("PK"), "cv.docx"), /archive/);
  zip.file("word/bomb.xml", "x".repeat(2 * 1024 * 1024));
  assert.throws(() => validateFileContent(Buffer.from("a\0b"), "notes.txt"), /plain text/);
  assert.throws(() => validateFileContent(Buffer.from("<svg></svg>"), "picture.svg"), /unsupported/);
  const bomb = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  assert.throws(() => validateFileContent(bomb, "cv.docx"), /Unsafe/);
  const dishonest = Buffer.from(bomb);
  const signature = Buffer.from("504b0102", "hex");
  let cursor = dishonest.indexOf(signature);
  while (cursor >= 0) {
    const length = dishonest.readUInt16LE(cursor + 28);
    if (dishonest.subarray(cursor + 46, cursor + 46 + length).toString() === "word/bomb.xml") {
      dishonest.writeUInt32LE(100, cursor + 24);
      break;
    }
    cursor = dishonest.indexOf(signature, cursor + 4);
  }
  assert.throws(() => validateFileContent(dishonest, "cv.docx"), /oversized/);
});

test("upload middleware rejects MIME spoofing, content spoofing and oversized files", async (t) => {
  const app = express();
  app.post("/upload", uploadMiddleware({ field: "cv", maxSize: 32, extensions: [".pdf"], memory: true }),
    (req, res) => res.json({ size: req.file.size }));
  app.use((error, _req, res, _next) => res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.message }));
  const base = await serve(t, app);
  assert.equal((await fetch(`${base}/upload`, { method: "POST", body: multipart(PDF) })).status, 200);
  assert.equal((await fetch(`${base}/upload`, { method: "POST", body: multipart(PDF, "cv.pdf", "text/html") })).status, 400);
  assert.equal((await fetch(`${base}/upload`, { method: "POST", body: multipart(Buffer.from("html")) })).status, 400);
  assert.equal((await fetch(`${base}/upload`, { method: "POST", body: multipart(Buffer.alloc(33)) })).status, 413);
});

test("CV preview defers content checks to its parser worker while retaining upload restrictions", async (t) => {
  const { cvParseUpload } = require("../middleware/cvParse.middleware");
  const { extractCvTextFromBuffer } = require("../services/cvParser.service");
  const app = express();
  let deliveredToWorker = false;
  app.post("/preview", cvParseUpload, async (req, res) => {
    deliveredToWorker = true;
    try {
      await extractCvTextFromBuffer(req.file.buffer, req.file.originalname);
      res.json({ success: true });
    } catch (error) {
      res.status(error.status).json({ code: error.code });
    }
  });
  app.use((error, _req, res, _next) => res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ code: error.code }));
  const base = await serve(t, app);
  const invalid = await fetch(`${base}/preview`, { method: "POST", body: multipart(Buffer.from("PK"), "cv.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document") });
  assert.equal(deliveredToWorker, true);
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, "INVALID_FILE");
  deliveredToWorker = false;
  assert.equal((await fetch(`${base}/preview`, { method: "POST", body: multipart(PDF, "cv.pdf", "text/html") })).status, 400);
  assert.equal(deliveredToWorker, false);
  assert.equal((await fetch(`${base}/preview`, { method: "POST", body: multipart(Buffer.alloc(5 * 1024 * 1024 + 1)) })).status, 413);
  assert.equal(deliveredToWorker, false);
  assert.throws(() => uploadMiddleware({ field: "cv", maxSize: 10, extensions: [".pdf"], deferContentValidation: true }), /in-memory CV/);
});

test("disk upload is cleaned up after a rejected controller response", async (t) => {
  const app = express();
  let uploaded;
  app.post("/upload", uploadMiddleware({ field: "cv", maxSize: 100, extensions: [".pdf"] }), (req, res) => {
    uploaded = req.file.filename;
    res.status(400).json({ message: "invalid input" });
  });
  const base = await serve(t, app);
  const result = await fetch(`${base}/upload`, { method: "POST", body: multipart(PDF) });
  assert.equal(result.status, 400);
  // Filesystem cleanup is asynchronous; wait only until this specific file is gone.
  for (let i = 0; i < 50; i++) {
    try { await fs.access(path.join(uploadsDir, uploaded)); }
    catch { return; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("failed upload file remains on disk");
});

test("downloads require authenticated, record-scoped read permission", async (t) => {
  t.mock.method(Role, "findOne", () => ({ lean: async () => ({ permissions: [{ resource: "candidate", action: "read", scope: "department" }] }) }));
  let seen;
  t.mock.method(Candidate, "exists", async query => { seen = query; return null; });
  t.mock.method(Source, "exists", async () => { throw new Error("no source permission"); });
  const req = { user: { id: USER_ID, role: "hr", departmentId: "department-a" } };
  assert.equal(await canReadStoredFile(req, "another.pdf"), false);
  assert.deepEqual(seen.$and[0], { departmentId: "department-a" });
  t.mock.method(Candidate, "exists", async () => ({ _id: USER_ID }));
  assert.equal(await canReadStoredFile(req, "allowed.pdf"), true);
  const res = response();
  await getUploadedFile({ params: { filename: "allowed.pdf" } }, res, () => assert.fail("auth was not enforced"));
  assert.equal(res.statusCode, 401);
});

test("authorized downloads use attachment disposition and private caching", async (t) => {
  t.mock.method(Role, "findOne", () => ({ lean: async () => ({ permissions: [{ resource: "candidate", action: "read", scope: "own" }] }) }));
  t.mock.method(Candidate, "exists", async () => ({ _id: USER_ID }));
  const filename = `${crypto.randomUUID()}.pdf`;
  await ensureUploadsDirectory();
  await fs.writeFile(path.join(uploadsDir, filename), PDF);
  t.after(() => removeStoredFile(filename));
  const app = express();
  app.get("/uploads/:filename", (req, _res, next) => { req.user = { id: USER_ID, role: "user" }; next(); }, getUploadedFile);
  const base = await serve(t, app);
  const result = await fetch(`${base}/uploads/${filename}`);
  assert.equal(result.status, 200);
  assert.match(result.headers.get("content-disposition"), /^attachment;/);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.equal(result.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), PDF);
});

test("library scope is explicit and validates untrusted filter values", () => {
  const req = { user: { id: USER_ID, departmentId: "department-a" }, permission: { scope: "own" } };
  assert.deepEqual(scopeFilter(req, "audit.source_document"), { uploadedBy: USER_ID });
  assert.deepEqual(scopeFilter(req, "audit.template"), { createdBy: USER_ID });
  assert.equal(scopeFilter({ ...req, permission: { scope: "unknown" } }, "audit.template"), null);
  assert.deepEqual(identifierFilter("source-legacy"), { id: "source-legacy" });
  assert.ok(identifierFilter(USER_ID).$or.some(filter => filter._id === USER_ID));
  assert.throws(() => identifierFilter({ $ne: "" }), /string/);
});

test("source deletion accepts ObjectId, removes legacy references and safely removes stored data", async (t) => {
  const filename = `${crypto.randomUUID()}.pdf`;
  await ensureUploadsDirectory();
  await fs.writeFile(path.join(uploadsDir, filename), PDF);
  t.after(() => removeStoredFile(filename));
  const doc = { _id: USER_ID, id: "source-legacy", fileName: filename, originalName: "cv.pdf" };
  let lookup;
  let pulled;
  t.mock.method(Source, "findOne", filter => { lookup = filter; return { lean: async () => doc }; });
  t.mock.method(Source, "findOneAndDelete", async () => doc);
  t.mock.method(Template, "updateMany", async (_filter, update) => { pulled = update.$pull.sourceDocumentIds.$in; });
  t.mock.method(Template, "find", () => ({ select() { return this; }, lean: async () => [] }));
  const Activity = require("../models/activityLog.model");
  t.mock.method(Activity, "create", async () => ({}));
  const res = response();
  await sourceController.deleteDocument({ params: { id: USER_ID }, user: { id: USER_ID }, permission: { scope: "own" } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(lookup.$and.some(filter => filter.uploadedBy === USER_ID));
  assert.deepEqual(pulled, [USER_ID, "source-legacy"]);
  await assert.rejects(fs.access(path.join(uploadsDir, filename)), { code: "ENOENT" });
});

test("source uploads record authenticated ownership rather than client actors", async (t) => {
  let stored;
  t.mock.method(Source, "create", async value => { stored = value; return { ...value, _id: USER_ID }; });
  const Activity = require("../models/activityLog.model");
  t.mock.method(Activity, "create", async () => ({}));
  const req = { body: { uploadedBy: "attacker", assignedTo: "attacker", departmentId: "other" },
    user: { id: USER_ID, departmentId: "department-a" }, permission: { scope: "assigned" },
    file: { filename: "fixture.pdf", originalname: "fixture.pdf", mimetype: "application/pdf", size: PDF.length } };
  const res = response();
  await sourceController.uploadDocument(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(stored.uploadedBy, USER_ID);
  assert.equal(stored.assignedTo, USER_ID);
  assert.equal(stored.departmentId, "department-a");
  assert.equal(res.body.filePath, "/uploads/fixture.pdf");
});

test("source deletion retains evidence referenced by executed templates", async (t) => {
  t.mock.method(Source, "findOne", () => ({ lean: async () => ({ _id: USER_ID, id: "source-evidence", fileName: "evidence.pdf" }) }));
  t.mock.method(Template, "find", () => ({ select() { return this; }, lean: async () => [{ _id: USER_ID }] }));
  const Execution = require("../models/auditExecution.model");
  t.mock.method(Execution, "exists", async () => ({ _id: USER_ID }));
  t.mock.method(Source, "findOneAndDelete", async () => assert.fail("evidence must not be deleted"));
  const res = response();
  await sourceController.deleteDocument({ params: { id: USER_ID }, user: { id: USER_ID }, permission: { scope: "all" } }, res);
  assert.equal(res.statusCode, 409);
});

test("template validation rejects duplicate question ids and invalid active checklists", () => {
  const input = { brandName: "Brand", auditType: "service", name: "Checklist", sections: [{ id: "section", title: "Section", questions: [{ id: "question", label: "Question" }] }] };
  assert.equal(templateInput(input).sections[0].questions[0].id, "question");
  assert.throws(() => templateInput({ ...input, sections: [{ ...input.sections[0], questions: [input.sections[0].questions[0], input.sections[0].questions[0]] }] }), /unique/);
  assert.throws(() => templateInput({ ...input, status: "active", sections: [] }), /active question/);
  assert.throws(() => templateInput({ ...input, visitCount: -1 }), /nonnegative/);
  assert.throws(() => templateInput({ ...input, name: { $ne: "" } }), /string/);
});

test("template deletion archives without removing its identifier or source links", async (t) => {
  const template = new Template({ _id: USER_ID, name: "Historical checklist", brandName: "Brand", auditType: "service",
    status: "draft", sourceDocumentIds: ["507f1f77bcf86cd799439012"] });
  let saved = 0;
  t.mock.method(template, "save", async () => { saved++; return template; });
  let query;
  t.mock.method(Template, "findOne", async filter => { query = filter; return template; });
  t.mock.method(Template, "findOneAndDelete", async () => assert.fail("template identifiers must be retained"));
  t.mock.method(Source, "updateMany", async () => assert.fail("archiving must preserve source links"));
  const Activity = require("../models/activityLog.model");
  t.mock.method(Activity, "create", async () => ({}));
  const req = { params: { id: USER_ID }, user: { id: USER_ID }, permission: { scope: "own" } };
  const res = response();
  await templateController.deleteTemplate(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "archived");
  assert.ok(query.$and.some(filter => filter.createdBy === USER_ID));
  assert.equal(template.status, "archived");
  assert.equal(template.updatedBy, USER_ID);
  assert.equal(String(template._id), USER_ID);
  assert.deepEqual(template.sourceDocumentIds, ["507f1f77bcf86cd799439012"]);
  await templateController.deleteTemplate(req, response());
  assert.equal(saved, 1, "repeated deletion must be idempotent");
});

test("archived templates cannot be updated or reactivated", async (t) => {
  t.mock.method(Template, "findOne", async () => ({ status: "archived", save: async () => assert.fail("archived template must not change") }));
  for (const body of [{ status: "active" }, { name: "Change historical evidence" }]) {
    const res = response();
    await templateController.updateTemplate({ params: { id: USER_ID }, body, user: { id: USER_ID }, permission: { scope: "all" } }, res);
    assert.equal(res.statusCode, 409);
  }
});
