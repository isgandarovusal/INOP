const test = require("node:test");
const assert = require("node:assert/strict");
const { parseStructuredCv } = require("../services/cvStructuredParser.service");

test("structured CV parser extracts core candidate fields", () => {
  const parsed = parseStructuredCv(`
Jane Smith
jane@example.com
+994 50 123 45 67
Role: Backend Developer
Education
ADA University
Skills
JavaScript Node.js MongoDB Docker
Languages
English Azerbaijani
Certificates
AWS Cloud Practitioner
3 years experience
`);

  assert.equal(parsed.name, "Jane Smith");
  assert.equal(parsed.email, "jane@example.com");
  assert.equal(parsed.role, "Backend Developer");
  assert.ok(parsed.skills.includes("Node.js"));
  assert.ok(parsed.languages.includes("English"));
  assert.equal(parsed.experience, 3);
});
