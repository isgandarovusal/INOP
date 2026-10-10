const test = require("node:test");
const assert = require("node:assert/strict");
const { parseListQuery, searchFilter, listRecords } = require("../utils/listQuery");
const { calculateApplicationMatch } = require("../services/applicationMatch.service");
const { parseStructuredCv } = require("../services/cvStructuredParser.service");
const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const candidates = require("../controllers/candidates.controller");
const jobs = require("../controllers/jobs.controller");

test("pagination rejects malformed and excessive query values", () => {
  assert.deepEqual(parseListQuery({ limit: "20", page: "3" }), { limit: 20, page: 3, skip: 40 });
  assert.equal(parseListQuery().limit, 1000);
  for (const query of [{ limit: "0" }, { page: "-1" }, { limit: "1001" }, { limit: ["1", "2"] }, { page: "10000" }]) {
    assert.throws(() => parseListQuery(query), { status: 400 });
  }
  assert.equal(searchFilter({ search: "(admin).*" }, ["name"]).$or[0].name.$regex, "\\(admin\\)\\.\\*");
});

test("paginated results retain shape and disclose total and continuation headers", async () => {
  const operations = [];
  const query = Object.fromEntries(["sort", "skip", "limit", "populate"].map(name => [name, value => { operations.push([name, value]); return query; }]));
  query.lean = async () => [{ _id: "1" }, { _id: "2" }];
  const model = { find: filter => { assert.deepEqual(filter, { departmentId: "d" }); return query; }, countDocuments: async () => 5 };
  const headers = {};
  const result = await listRecords(model, { departmentId: "d" }, { query: { page: "1", limit: "2" } }, { setHeader: (key, value) => { headers[key] = value; } });
  assert.equal(result.length, 2);
  assert.equal(headers["X-Total-Count"], "5");
  assert.equal(headers["X-Next-Page"], "2");
  assert.ok(operations.some(([operation, value]) => operation === "limit" && value === 2));
});

test("CV extraction avoids substring skills and handles Unicode names", () => {
  const result = parseStructuredCv("Иван Иванов\nOperations manager\nResponsible for goals and reacting to incidents\nSkills\nC++, React, GitHub, English");
  assert.equal(result.name, "Иван Иванов");
  assert.equal(result.skills.includes("Go"), false);
  assert.equal(result.skills.includes("Git"), false);
  assert.ok(result.skills.includes("C++"));
  assert.ok(result.skills.includes("React"));
});

test("application matching deduplicates requirements and cannot yield nonfinite scores", () => {
  const match = calculateApplicationMatch({ requiredSkills: ["React", "React", "Docker"], experienceYears: 2 }, { skills: ["React"], experience: 2 });
  assert.equal(match.breakdown.requiredSkills, 50);
  assert.equal(match.score, 65);
  const invalid = calculateApplicationMatch({ requiredSkills: [], experienceYears: Infinity }, { experience: Infinity });
  assert.ok(Number.isFinite(invalid.score));
});

test("recruitment deletion preserves historical references using soft deletion", async t => {
  // Controllers retain their imported activity function, so replace its model write.
  const ActivityLog = require("../models/activityLog.model");
  t.mock.method(ActivityLog, "create", async () => ({}));
  for (const [model, controller] of [[Candidate, candidates.deleteCandidate], [Job, jobs.deleteJob]]) {
    let observed;
    t.mock.method(model, "findOneAndUpdate", async (query, update, options) => {
      observed = { query, update, options };
      return { _id: "507f1f77bcf86cd799439011", name: "Fixture", role: "Developer", title: "Fixture" };
    });
    const res = { code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
    await controller({ params: { id: "507f1f77bcf86cd799439011" }, dataScope: { departmentId: "d" }, user: { id: "507f1f77bcf86cd799439011", name: "Fixture" } }, res);
    assert.equal(res.code, 200);
    assert.equal(observed.query.deletedAt, null);
    assert.equal(observed.query.departmentId, "d");
    assert.ok(observed.update.$set.deletedAt instanceof Date);
    assert.equal(observed.options.runValidators, true);
  }
});

test("CV pipeline preserves parser overload/timeouts and removes rejected uploads", async t => {
  const fs = require("node:fs/promises");
  const path = require("node:path");
  const os = require("node:os");
  const parser = require("../services/cvParser.service");
  let status;
  t.mock.method(parser, "extractCvTextFromFile", async () => {
    throw Object.assign(new Error("Parser rejected request"), { status });
  });
  const modulePath = require.resolve("../controllers/candidatePipeline.controller");
  delete require.cache[modulePath];
  const { createCandidateFromCv } = require(modulePath);
  t.after(() => { delete require.cache[modulePath]; });
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "inop-cv-pipeline-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (status of [503, 504]) {
    const filename = path.join(directory, `${status}.pdf`);
    await fs.writeFile(filename, "%PDF-1.4\nfixture\n%%EOF");
    const res = { code: 200, status(value) { this.code = value; return this; }, json(body) { this.body = body; return this; } };
    await createCandidateFromCv({ body: {}, file: { path: filename, originalname: "fixture.pdf" } }, res);
    assert.equal(res.code, status);
    assert.equal(res.body.success, false);
    await assert.rejects(fs.stat(filename), { code: "ENOENT" });
  }
});
