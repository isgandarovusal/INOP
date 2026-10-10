const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const JSZip = require("jszip");
const PDFDocument = require("pdfkit");
const { extractCvTextFromBuffer, extractCvTextFromFile } = require("../services/cvParser.service");

async function docx(text = "Worker CV extraction") {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function pdf() {
  const document = new PDFDocument();
  const chunks = [];
  const complete = new Promise((resolve, reject) => {
    document.on("data", chunk => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
  document.text("PDF CV extraction\nSoftware Engineer");
  document.end();
  return complete;
}

test("workers extract real DOCX and PDF documents and preserve caller buffers", async () => {
  const documents = [await docx("Applicant   Name"), await pdf()];
  const snapshots = documents.map(buffer => Buffer.from(buffer));
  const [wordText, pdfText] = await Promise.all([
    extractCvTextFromBuffer(documents[0], "resume.DOCX"),
    extractCvTextFromBuffer(documents[1], "resume.pdf"),
  ]);
  assert.equal(wordText, "Applicant Name");
  assert.match(pdfText, /PDF CV extraction/);
  assert.match(pdfText, /Software Engineer/);
  documents.forEach((buffer, index) => assert.deepEqual(buffer, snapshots[index]));
});

test("CV parsing rejects unsupported, empty, oversized and malformed documents", async () => {
  await assert.rejects(extractCvTextFromBuffer("not a buffer", "resume.pdf"), { status: 400 });
  await assert.rejects(extractCvTextFromBuffer(Buffer.alloc(0), "resume.pdf"), { status: 400 });
  await assert.rejects(extractCvTextFromBuffer(Buffer.alloc(5 * 1024 * 1024 + 1), "resume.pdf"), { status: 413 });
  await assert.rejects(extractCvTextFromBuffer(Buffer.from("text"), "resume.txt"), { status: 400 });
  await assert.rejects(extractCvTextFromBuffer(Buffer.from("html"), "resume.pdf"), { status: 400 });
  await assert.rejects(extractCvTextFromBuffer(Buffer.from("PK"), "resume.docx"), { status: 400 });
  await assert.rejects(extractCvTextFromBuffer(Buffer.from("%PDF-1.7\nnot a valid PDF"), "resume.pdf"), { status: 422 });
});

test("DOCX validation prevents decompression bombs before parser extraction", async () => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types />");
  zip.file("word/document.xml", "x".repeat(2 * 1024 * 1024));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await assert.rejects(extractCvTextFromBuffer(buffer, "resume.docx"), { status: 400, code: "INVALID_FILE" });
});

test("text extraction caps output at 100,000 characters", async () => {
  const text = await extractCvTextFromBuffer(await docx("a".repeat(100_010)), "resume.docx");
  assert.equal(text.length, 100_000);
});

test("two workers and four queued requests reject excess load and recover", async () => {
  const buffer = await docx();
  const results = await Promise.allSettled(Array.from({ length: 7 }, () => extractCvTextFromBuffer(buffer, "resume.docx")));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 6);
  const rejected = results.filter(result => result.status === "rejected");
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.status, 503);
  assert.equal(rejected[0].reason.code, "CV_QUEUE_FULL");
  assert.equal(await extractCvTextFromBuffer(buffer, "resume.docx"), "Worker CV extraction");
});

test("active and queued requests expire and worker termination permits recovery", async (t) => {
  const buffer = await docx();
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const result = Promise.allSettled(Array.from({ length: 3 }, () => extractCvTextFromBuffer(buffer, "resume.docx")));
  t.mock.timers.tick(15_000);
  const results = await result;
  for (const item of results) {
    assert.equal(item.status, "rejected");
    assert.equal(item.reason.status, 504);
    assert.equal(item.reason.code, "CV_PARSE_TIMEOUT");
  }
  t.mock.timers.reset();
  assert.equal(await extractCvTextFromBuffer(buffer, "resume.docx"), "Worker CV extraction");
});

test("file extraction reads a real document and refuses oversized files before parsing", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "inop-cv-parser-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "resume.docx");
  await fs.writeFile(filename, await docx());
  assert.equal(await extractCvTextFromFile(filename), "Worker CV extraction");
  const handle = await fs.open(path.join(directory, "oversized.pdf"), "w");
  await handle.truncate(5 * 1024 * 1024 + 1);
  await handle.close();
  await assert.rejects(extractCvTextFromFile(path.join(directory, "oversized.pdf")), { status: 413 });
});

test("initialized idle workers do not keep a Node process alive", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "inop-cv-exit-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "resume.docx");
  await fs.writeFile(filename, await docx());
  const source = `require(${JSON.stringify(require.resolve("../services/cvParser.service"))}).extractCvTextFromFile(${JSON.stringify(filename)}).then(text => process.stdout.write(text)).catch(() => process.exitCode = 1);`;
  const child = spawn(process.execPath, ["-e", source], { stdio: ["ignore", "pipe", "pipe"] });
  const deadline = setTimeout(() => child.kill(), 10_000);
  t.after(() => { clearTimeout(deadline); if (child.exitCode === null) child.kill(); });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => { output += chunk; });
  const [code, signal] = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve([code, signal]));
  });
  clearTimeout(deadline);
  assert.equal(signal, null, "child process required forced termination");
  assert.equal(code, 0);
  assert.equal(output, "Worker CV extraction");
});
