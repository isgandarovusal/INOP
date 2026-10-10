const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createApp } = require("../app");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const Department = require("../models/department.model");
const Audit = require("../models/audit.model");
const AuditFinding = require("../models/auditFinding.model");
const AuditExecution = require("../models/auditExecution.model");
const AuditLibraryLock = require("../models/auditLibraryLock.model");
const Restaurant = require("../models/restaurant.model");
const Candidate = require("../models/candidate.model");
const Job = require("../models/job.model");
const { removeStoredFile } = require("../services/fileStorage.service");

// The supplied URI selects a MongoDB server, never the database to mutate.
// Every run creates and drops only its own randomly named test database.
test("MongoDB-backed API integration", { skip: !process.env.TEST_MONGO_URI, timeout: 60000 }, async t => {
  const databaseName = `inop_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const files = new Set();
  let server;
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  process.env.NODE_ENV = "production";
  // Tests must never send mail to fixture addresses, even on configured hosts.
  delete process.env.SMTP_HOST;
  mongoose.set("maxTimeMS", 10000);
  await mongoose.connect(process.env.TEST_MONGO_URI, {
    dbName: databaseName, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000,
  });
  t.after(async () => {
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    for (const filename of files) await removeStoredFile(filename);
    assert.equal(mongoose.connection.name, databaseName);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  const department = await Department.create({ name: "Integration Department" });
  const otherDepartment = await Department.create({ name: "Other Department" });
  const adminRole = await Role.create({ name: "Administrator", key: "admin", isSystemRole: true,
    permissions: [{ resource: "*", action: "*", scope: "all" }] });
  const managerRole = await Role.create({ name: "HR Manager", key: "test_manager", permissions: [
    { resource: "user", action: "read", scope: "department" },
    { resource: "user", action: "update", scope: "department" },
    { resource: "user", action: "create", scope: "department" },
    { resource: "candidate", action: "*", scope: "department" },
    { resource: "recruitment", action: "*", scope: "department" },
    { resource: "application", action: "*", scope: "department" },
  ] });
  await Role.create({ name: "Auditor", key: "test_auditor", permissions: [
    { resource: "audit", action: "read", scope: "assigned" },
    { resource: "audit.execution", action: "read", scope: "assigned" },
    { resource: "audit.finding", action: "read", scope: "assigned" },
    { resource: "audit.template", action: "read", scope: "own" },
    { resource: "audit.source_document", action: "read", scope: "own" },
  ] });
  await Role.create({ name: "Department Auditor", key: "test_department_auditor", permissions: [
    { resource: "audit.finding", action: "read", scope: "department" },
    { resource: "audit.execution", action: "read", scope: "department" },
  ] });
  const password = "FixturePassword123!";
  const hash = await bcrypt.hash(password, 4);
  async function user(name, role, departmentId = department.id) {
    return User.create({ name, email: `${name}@example.invalid`, role, password: hash, departmentId });
  }
  const admin = await user("administrator", "admin");
  const reviewer = await user("reviewer", "admin");
  const manager = await user("manager", "test_manager");
  const auditor = await user("auditor", "test_auditor");
  const departmentAuditor = await user("department-auditor", "test_department_auditor");
  const foreignAuditor = await user("foreign-auditor", "test_department_auditor", otherDepartment.id);
  await Promise.all([User.init(), Role.init(), Department.init(), Audit.init(), Candidate.init(), Job.init()]);
  const app = createApp({ env: { NODE_ENV: "production" } });
  server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, { method = "GET", token, body, status = 200 } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(`${base}${route}`, { method, headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(data)}`);
    return { data, headers: response.headers };
  }
  async function login(account) {
    const { data } = await request("/api/auth/login", { method: "POST", body: { email: account.email, password } });
    assert.equal(data.user.id, account.id);
    assert.equal(data.user.password, undefined);
    return data.token;
  }
  const adminToken = await login(admin);
  const reviewerToken = await login(reviewer);
  let managerToken = await login(manager);
  const auditorToken = await login(auditor);
  const departmentToken = await login(departmentAuditor);
  const foreignToken = await login(foreignAuditor);
  let audit, execution;

  await t.test("HR cannot promote itself or create administrators; password reset invalidates existing tokens", async () => {
    await request(`/api/users/${manager.id}`, { method: "PUT", token: managerToken, body: { role: "admin" }, status: 403 });
    await request("/api/users", { method: "POST", token: managerToken,
      body: { name: "Forged Admin", email: "forged@example.invalid", password, role: "admin", departmentId: department.id }, status: 403 });
    await request(`/api/users/${manager.id}`, { method: "PUT", token: adminToken, body: { password: "ChangedPassword123!" } });
    await request("/api/auth/me", { token: managerToken, status: 401 });
    const { data } = await request("/api/auth/login", { method: "POST", body: { email: manager.email, password: "ChangedPassword123!" } });
    managerToken = data.token;
    await request(`/api/roles/${managerRole.id}`, { method: "PUT", token: adminToken, body: { key: "renamed_manager" }, status: 409 });
    assert.equal((await Role.findById(adminRole.id)).key, "admin");
  });

  await t.test("audit lists and child records enforce assigned and department visibility", async () => {
    ({ data: audit } = await request("/api/audits", { method: "POST", token: adminToken,
      body: { id: "integration-audit", restaurantId: "fixture-restaurant", auditType: "service", date: "2026-10-10",
        status: "completed", auditorId: auditor.id, createdBy: auditor.id, totalScore: 999 } , status: 201 }));
    assert.equal(audit.status, "draft");
    assert.equal(audit.auditorId, admin.id);
    assert.equal(audit.totalScore, 0);
    assert.equal((await request("/api/audits", { token: auditorToken })).data.length, 0);
    assert.equal((await request("/api/audit-module/service", { token: auditorToken })).data.data.length, 0);
    await request(`/api/audit-findings/${audit._id}`, { token: auditorToken, status: 403 });
    await request(`/api/audit-findings/${audit._id}`, { token: departmentToken });
    await request(`/api/audit-findings/${audit._id}`, { token: foreignToken, status: 403 });
    await request("/api/audit-assignments", { method: "POST", token: adminToken,
      body: { auditId: audit._id, auditor: auditor.id }, status: 201 });
    assert.equal((await request("/api/audits", { token: auditorToken })).data.length, 1);
    assert.equal((await request("/api/audit-module/service", { token: auditorToken })).data.data.length, 1);
    await request(`/api/audit-workflow/${audit._id}/status`, { method: "PATCH", token: adminToken, body: { status: "in-progress" } });
    await request("/api/audit-closure", { method: "POST", token: adminToken, body: { auditId: audit._id }, status: 400 });
  });

  await t.test("executions use server scoring; independent approval permits closure and freezes evidence", async () => {
    const { data: template } = await request("/api/audit-templates", { method: "POST", token: adminToken, status: 201,
      body: { name: "Integration Checklist", brandName: "Fixture", auditType: "service", status: "active",
        sections: [{ id: "section", title: "Checks", questions: [
          { id: "yes", label: "Ready?", answerType: "yes-no-na" },
          { id: "score", label: "Rating", answerType: "score" },
        ] }] } });
    ({ data: { data: execution } } = await request("/api/audit-execution", { method: "POST", token: adminToken,
      body: { auditId: audit._id, checklistId: template._id || template.id }, status: 201 }));
    assert.equal(execution.checklist.length, 2);
    await request(`/api/audit-execution/${execution._id}`, { token: auditorToken });
    await request(`/api/audit-execution/${execution._id}`, { token: departmentToken });
    await request(`/api/audit-execution/${execution._id}`, { token: foreignToken, status: 403 });
    await request(`/api/audit-execution/${execution._id}/submit`, { method: "PATCH", token: adminToken, body: { answers: [] }, status: 400 });
    const { data: submitted } = await request(`/api/audit-execution/${execution._id}/submit`, { method: "PATCH", token: adminToken,
      body: { totalScore: 999, answers: [{ questionId: "yes", value: "yes", score: 999 }, { questionId: "score", value: "3" }] } });
    assert.equal(submitted.data.totalScore, 66.67);
    const attachment = new FormData();
    attachment.append("file", new Blob(["%PDF-1.4\nfixture attachment\n%%EOF"], { type: "application/pdf" }), "attachment.pdf");
    const { data: stored } = await request(`/api/audits/${audit._id}/attachments`, {
      method: "POST", token: adminToken, body: attachment, status: 201,
    });
    files.add(stored.fileName);
    await request(stored.url, { token: auditorToken });
    await request(stored.url, { status: 401 });
    await request("/api/audit-approval", { method: "POST", token: adminToken, body: { auditId: audit._id, reviewer: admin.id }, status: 403 });
    const { data: created } = await request("/api/audit-approval", { method: "POST", token: adminToken,
      body: { auditId: audit._id, reviewer: reviewer.id, status: "approved" }, status: 201 });
    assert.equal(created.data.status, "pending");
    await request(`/api/audit-approval/${created.data._id}`, { method: "PATCH", token: adminToken, body: { status: "approved" }, status: 403 });
    await request(`/api/audit-approval/${created.data._id}`, { method: "PATCH", token: reviewerToken, body: { status: "approved" } });
    await request("/api/audit-closure", { method: "POST", token: adminToken, body: { auditId: audit._id }, status: 201 });
    await request("/api/audit-findings", { method: "POST", token: adminToken, body: { auditId: audit._id, title: "Late finding" }, status: 409 });
    await request(`/api/audits/${audit._id}`, { method: "PUT", token: adminToken, body: { comments: "late edit" }, status: 409 });
    assert.equal(await AuditFinding.countDocuments({ auditId: audit._id }), 0);
    assert.equal((await Audit.findById(audit._id)).status, "completed");
  });

  await t.test("audit leases block competing writes and deletion preserves related evidence", async () => {
    const { data: removable } = await request("/api/audits", { method: "POST", token: adminToken, status: 201,
      body: { restaurantId: "fixture-restaurant", auditType: "service", date: "2026-10-10" } });
    await Audit.updateOne({ _id: removable._id }, { $set: { mutationLock: { token: "fixture-lock", expiresAt: new Date(Date.now() + 60000) } } }, { timestamps: false });
    await request(`/api/audits/${removable._id}`, { method: "PUT", token: adminToken, body: { comments: "collision" }, status: 409 });
    await request("/api/audit-findings", { method: "POST", token: adminToken, body: { auditId: removable._id, title: "collision" }, status: 409 });
    await Audit.updateOne({ _id: removable._id }, { $unset: { mutationLock: "" } }, { timestamps: false });
    const { data: finding } = await request("/api/audit-findings", { method: "POST", token: adminToken,
      body: { auditId: removable._id, title: "Preserved evidence" }, status: 201 });
    await request(`/api/audits/${removable._id}`, { method: "DELETE", token: adminToken });
    await request(`/api/audits/${removable._id}`, { token: adminToken, status: 404 });
    await request(`/api/audit-findings/${removable._id}`, { token: adminToken, status: 404 });
    assert.ok((await Audit.findById(removable._id)).deletedAt);
    assert.ok(await AuditFinding.findById(finding.data._id));
  });

  await t.test("uploaded documents are private and delete accepts returned MongoDB identifier", async () => {
    const form = new FormData();
    const pdf = "%PDF-1.4\nfixture document\n%%EOF";
    form.append("file", new Blob([pdf], { type: "application/pdf" }), "fixture.pdf");
    form.append("auditType", "service");
    const { data: document } = await request("/api/audit-source-documents", { method: "POST", token: adminToken, body: form, status: 201 });
    files.add(document.fileName);
    assert.equal(document.id.length, 24);
    await request(document.url, { status: 401 });
    await request(document.url, { token: auditorToken, status: 404 });
    const { data, headers } = await request(document.url, { token: adminToken });
    assert.equal(data.toString(), pdf);
    assert.match(headers.get("content-disposition"), /^attachment/);
    assert.equal(headers.get("cache-control"), "private, no-store");
    await AuditLibraryLock.updateOne({ _id: "library" }, { $set: { token: "fixture-lock", expiresAt: new Date(Date.now() + 60000) } });
    await request(`/api/audit-source-documents/${document.id}`, { method: "DELETE", token: adminToken, status: 409 });
    await request(document.url, { token: adminToken });
    await AuditLibraryLock.updateOne({ _id: "library" }, { $unset: { token: "", expiresAt: "" } });
    await request(`/api/audit-source-documents/${document.id}`, { method: "DELETE", token: adminToken });
    await request(document.url, { token: adminToken, status: 404 });
  });

  await t.test("recruitment deletion retains historical application references and enforces pagination", async () => {
    const { data: job } = await request("/api/jobs", { method: "POST", token: managerToken, status: 201,
      body: { title: "Developer", department: "Engineering", description: "Fixture role", requiredSkills: ["JavaScript"] } });
    const candidateForm = new FormData();
    candidateForm.append("name", "Fixture Candidate");
    candidateForm.append("role", "Developer");
    candidateForm.append("skills", "JavaScript");
    candidateForm.append("cv", new Blob(["%PDF-1.4\nfixture CV\n%%EOF"], { type: "application/pdf" }), "fixture-cv.pdf");
    const { data: candidate } = await request("/api/candidates", { method: "POST", token: managerToken, status: 201, body: candidateForm });
    files.add(candidate.cvUrl.split("/").at(-1));
    await request(candidate.cvUrl, { status: 401 });
    await request(candidate.cvUrl, { token: auditorToken, status: 404 });
    await request(candidate.cvUrl, { token: managerToken });
    const { data: application } = await request("/api/applications", { method: "POST", token: managerToken, status: 201,
      body: { jobId: job._id, candidateId: candidate._id } });
    const page = await request("/api/candidates?page=1&limit=1", { token: managerToken });
    assert.equal(page.headers.get("x-total-count"), "1");
    await request("/api/candidates?limit=1001", { token: managerToken, status: 400 });
    await request(`/api/candidates/${candidate._id}`, { method: "DELETE", token: managerToken });
    await request(`/api/jobs/${job._id}`, { method: "DELETE", token: managerToken });
    await request(`/api/candidates/${candidate._id}`, { token: managerToken, status: 404 });
    await request(`/api/jobs/${job._id}`, { token: managerToken, status: 404 });
    const { data: historical } = await request(`/api/applications/${application._id}`, { token: managerToken });
    assert.equal(historical.candidateId.name, "Fixture Candidate");
    assert.equal(historical.jobId.title, "Developer");
    assert.ok(historical.candidateId.deletedAt);
    assert.ok(historical.jobId.deletedAt);
    await request(candidate.cvUrl, { token: managerToken });
  });

  await t.test("restaurant identifiers and ownership cannot be overwritten; deletion retains audit references", async () => {
    const { data: restaurant } = await request("/api/restaurants", { method: "POST", token: adminToken, status: 201,
      body: { id: "spoofed", name: "Fixture Restaurant", createdBy: auditor.id, departmentId: otherDepartment.id } });
    assert.match(restaurant.id, /^rest-[\da-f-]{36}$/);
    assert.equal(restaurant.createdBy, admin.id);
    assert.equal(restaurant.departmentId, department.id);
    await request(`/api/restaurants/${restaurant.id}`, { method: "PUT", token: adminToken, body: { id: "changed", name: "Changed" }, status: 400 });
    await Audit.updateOne({ _id: audit._id }, { $set: { restaurantId: restaurant.id } });
    await request(`/api/restaurants/${restaurant.id}`, { method: "DELETE", token: adminToken });
    await request(`/api/restaurants/${restaurant.id}`, { token: adminToken, status: 404 });
    assert.ok((await Restaurant.findById(restaurant._id)).deletedAt);
    assert.equal((await Audit.findById(audit._id)).restaurantId, restaurant.id);
  });

  await t.test("logout revokes the current JWT and the final administrator cannot be disabled", async () => {
    await request("/api/auth/logout", { method: "POST", token: auditorToken });
    await request("/api/auth/me", { token: auditorToken, status: 401 });
    await request(`/api/users/${reviewer.id}/status`, { method: "PATCH", token: adminToken, body: { isActive: false } });
    await request(`/api/users/${admin.id}/status`, { method: "PATCH", token: adminToken, body: { isActive: false }, status: 409 });
    assert.equal(await User.countDocuments({ role: "admin", isActive: true }), 1);
    assert.equal(await AuditExecution.countDocuments({ auditId: audit._id }), 1);
  });
});
