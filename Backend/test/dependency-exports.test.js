const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const JSZip = require("jszip");
const mammoth = require("mammoth");
const { buildExcelBuffer } = require("../utils/spreadsheet");

async function createDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>DOCX compatibility check</w:t></w:r></w:p></w:body></w:document>');
  return zip.generateAsync({ type: "nodebuffer" });
}

test("DOCX parsing and Mammoth CLI remain compatible with argparse 2", async (t) => {
  const buffer = await createDocx();
  const { value } = await mammoth.extractRawText({ buffer });
  assert.equal(value.trim(), "DOCX compatibility check");

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "inop-docx-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "fixture.docx");
  await fs.writeFile(filename, buffer);
  const command = require.resolve("mammoth/bin/mammoth");
  const result = spawnSync(process.execPath, [command, filename, "--output-format", "html"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<p>DOCX compatibility check<\/p>/);
  const help = spawnSync(process.execPath, [command, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--output-format/);
});

test("Excel exports preserve multiple sheets and types without evaluating user formulas", async () => {
  const buffer = await buildExcelBuffer([
    { name: "Candidates", rows: [{ Name: '=HYPERLINK("https://invalid.example")', Count: 42, Active: true, Created: new Date("2026-01-01T00:00:00Z") }] },
    { name: "Findings", rows: [{ Message: "No findings" }] },
  ]);
  assert.ok(Buffer.isBuffer(buffer));
  const zip = await JSZip.loadAsync(buffer);
  const workbook = await zip.file("xl/workbook.xml").async("string");
  const sheet = await zip.file("xl/worksheets/sheet1.xml").async("string");
  const strings = await zip.file("xl/sharedStrings.xml").async("string");
  assert.match(workbook, /name="Candidates"/);
  assert.match(workbook, /name="Findings"/);
  assert.match(sheet, /<c r="A2"[^>]*t="s"/);
  assert.match(strings, /=HYPERLINK/);
  assert.doesNotMatch(sheet, /<f(?:\s|>)/);
  assert.match(sheet, /<c r="B2"[^>]*><v>42<\/v>/);
  assert.match(sheet, /<c r="C2"[^>]*t="b"><v>1<\/v>/);
  assert.match(sheet, /<c r="D2"[^>]*><v>46023<\/v>/);
});
