const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { once } = require("node:events");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
process.env.JWT_SECRET =
  "integration-test-only-secret-never-for-deployment-123";
const { createApp } = require("../../server");
const { roles } = require("../../scripts/seedRoles");
let mongo, server, base;
const tokens = {},
  users = {};
async function request(role, url, method = "GET", body) {
  const response = await fetch(base + "/api" + url, {
    method,
    headers: {
      ...(tokens[role] ? { Authorization: "Bearer " + tokens[role] } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  const uri =
    process.env.TEST_MONGO_URI ||
    (mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: { version: "7.0.14" },
    })).getUri();
  await mongoose.connect(uri, { dbName: "inop_security_test_" + Date.now() });
  const Role = require("../../models/role.model"),
    User = require("../../models/user.model");
  await Role.insertMany(roles);
  for (const role of ["admin", "hr_manager", "auditor", "audit_manager"]) {
    users[role] = await User.create({
      name: role,
      email: role + "@example.invalid",
      password: await bcrypt.hash("Test-password-123", 4),
      role,
      departmentId: "hr",
    });
  }
  const app = createApp();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = "http://127.0.0.1:" + server.address().port;
  for (const role of Object.keys(users)) {
    const r = await request(null, "/auth/login", "POST", {
      email: role + "@example.invalid",
      password: "Test-password-123",
    });
    assert.equal(r.status, 200);
    tokens[role] = r.data.token;
  }
});
after(async () => {
  if (server) server.close();
  if (mongoose.connection.readyState) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test("HR privilege escalation and cross-department creation denied", async () => {
  let r = await request("hr_manager", "/users", "POST", {
    name: "Attack",
    email: "attack@example.invalid",
    password: "Test-password-123",
    role: "admin",
    departmentId: "hr",
  });
  assert.equal(r.status, 403);
  r = await request("hr_manager", "/users/" + users.hr_manager._id, "PUT", {
    role: "admin",
  });
  assert.equal(r.status, 403);
});
test("Full audit lifecycle requires completed execution and independent fresh approval", async () => {
  let r = await request("auditor", "/audits", "POST", {
    auditType: "service",
    restaurantId: "test-restaurant",
    date: "2026-09-28",
    status: "completed",
    checks: [{ checkId: "one", answer: "yes" }],
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const a = r.data;
  assert.equal(a.status, "draft");
  r = await request("auditor", "/audit-assignments", "POST", {
    auditId: a._id,
    auditor: users.auditor._id,
  });
  assert.equal(r.status, 403);
  r = await request(
    "auditor",
    "/audit-workflow/" + a._id + "/status",
    "PATCH",
    { status: "completed" },
  );
  assert.equal(r.status, 409);
  r = await request(
    "auditor",
    "/audit-workflow/" + a._id + "/status",
    "PATCH",
    { status: "in-progress" },
  );
  assert.equal(r.status, 200);
  r = await request("auditor", "/audit-execution", "POST", { auditId: a._id });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  const execution = r.data.data;
  r = await request(
    "auditor",
    "/audit-execution/" + execution._id + "/submit",
    "PUT",
    { answers: [{ questionId: "one", answer: "yes", score: 9999 }] },
  );
  assert.equal(r.status, 200);
  assert.equal(r.data.data.totalScore, 100);
  r = await request("auditor", "/audit-closure", "POST", { auditId: a._id });
  assert.equal(r.status, 409);
  r = await request("auditor", "/audit-findings", "POST", {
    auditId: a._id,
    title: "Missing sign",
  });
  assert.equal(r.status, 201);
  const f = r.data.data;
  for (const status of ["in-progress", "resolved"]) {
    r = await request("auditor", "/audit-findings/" + f._id, "PATCH", {
      status,
      resolution: "Sign installed",
    });
    assert.equal(r.status, 200);
  }
  r = await request("audit_manager", "/audit-findings/" + f._id, "PATCH", {
    status: "closed",
  });
  assert.equal(r.status, 200);
  r = await request("auditor", "/audit-approval", "POST", {
    auditId: a._id,
    reviewer: users.audit_manager._id,
    status: "approved",
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.data.status, "pending");
  const approval = r.data.data;
  r = await request("auditor", "/audit-approval/" + approval._id, "PATCH", {
    status: "approved",
  });
  assert.equal(r.status, 403);
  r = await request(
    "audit_manager",
    "/audit-approval/" + approval._id,
    "PATCH",
    { status: "approved" },
  );
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await request("auditor", "/audit-closure", "POST", { auditId: a._id });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const closure = r.data.data;
  r = await request("auditor", "/audit-closure", "POST", { auditId: a._id });
  assert.equal(r.status, 200);
  assert.equal(r.data.data._id, closure._id);
  r = await request("auditor", "/audits/" + a.id, "PUT", {
    comments: "change after closure",
  });
  assert.equal(r.status, 409);
});
test("Unassigned auditor cannot read alternate audit listing", async () => {
  const r = await request("admin", "/audits", "POST", {
    auditType: "standard",
    restaurantId: "other",
    date: "2026-09-28",
  });
  assert.equal(r.status, 201);
  const id = r.data._id;
  const list = await request("auditor", "/audit-module/standard");
  assert.equal(list.status, 200);
  assert(!list.data.data.some((a) => a._id === id));
  const get = await request("auditor", "/audits/" + id);
  assert.equal(get.status, 404);
});
test("Password update revokes old token", async () => {
  const r = await request("admin", "/users/" + users.hr_manager._id, "PUT", {
    password: "Replacement-password-123",
  });
  assert.equal(r.status, 200);
  const old = await request("hr_manager", "/users");
  assert.equal(old.status, 401);
});
test("Protected file download is owner-scoped", async () => {
  const Candidate = require("../../models/candidate.model");
  const fs = require("fs/promises");
  const path = require("path");
  const filename = "integration-fixture.pdf";
  const file = path.join(__dirname, "../../uploads", filename);
  await fs.writeFile(file, "%PDF-1.4\nTest fixture");
  try {
    await Candidate.create({
      name: "Private",
      role: "Developer",
      departmentId: "hr",
      createdBy: users.admin._id,
      assignedTo: users.admin._id,
      cvUrl: "/uploads/" + filename,
    });
    let r = await fetch(base + "/api/files/" + filename, {
      headers: { Authorization: "Bearer " + tokens.admin },
    });
    assert.equal(r.status, 200);
    r = await fetch(base + "/api/files/" + filename, {
      headers: { Authorization: "Bearer " + tokens.auditor },
    });
    assert.equal(r.status, 404);
    r = await fetch(base + "/uploads/" + filename);
    assert.equal(r.status, 404);
  } finally {
    await fs.unlink(file).catch(() => {});
  }
});
