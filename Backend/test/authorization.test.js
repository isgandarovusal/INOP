const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const ActivityLog = require("../models/activityLog.model");
const RevokedToken = require("../models/revokedToken.model");
const Department = require("../models/department.model");
const Job = require("../models/job.model");
const Candidate = require("../models/candidate.model");
const Application = require("../models/application.model");
const departments = require("../controllers/departments.controller");
const activity = require("../controllers/activityLog.controller");
const mongoose = require("mongoose");
const users = require("../controllers/users.controller");
const rolesController = require("../controllers/roles.controller");
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/authorization.middleware");
const { getDataScope } = require("../middleware/dataScope.middleware");
const { permissionScope, canDelegate } = require("../services/authorizationPolicy.service");
const { mutateAdminSafely } = require("../services/adminInvariant.service");
const { validateBootstrapInput, bootstrapAdmin } = require("../scripts/bootstrapAdmin");
const { validNewPassword } = require("../utils/passwordPolicy");

const ACTOR = "111111111111111111111111";
const TARGET = "222222222222222222222222";
const admin = { key: "admin", permissions: [{ resource: "*", action: "*", scope: "all" }] };
const hr = { key: "hr_manager", permissions: [
  { resource: "user", action: "read", scope: "department" },
  { resource: "user", action: "create", scope: "department" },
  { resource: "user", action: "update", scope: "department" },
  { resource: "candidate", action: "*", scope: "all" },
] };
const employee = { key: "employee", permissions: [
  { resource: "profile", action: "read", scope: "own" },
  { resource: "profile", action: "update", scope: "own" },
  { resource: "internal_request", action: "create", scope: "own" },
] };
const knownRoles = { admin, hr_manager: hr, employee };

function query(value) {
  return {
    select() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  };
}
function response() {
  return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
function request(body, overrides = {}) {
  return {
    body, query: {}, params: { id: TARGET },
    user: { id: ACTOR, role: "hr_manager", departmentId: "dep_hr", name: "HR" },
    authRole: hr, permission: { resource: "user", action: "update", scope: "department" },
    dataScope: { departmentId: "dep_hr" }, ...overrides,
  };
}
function document(t, values = {}) {
  return { _id: TARGET, name: "Employee", email: "employee@example.com", role: "employee", departmentId: "dep_hr", isActive: true, tokenVersion: 0,
    save: t.mock.fn(async () => undefined), deleteOne: t.mock.fn(async () => undefined), ...values };
}
function mockModels(t, user = null) {
  t.mock.method(User, "findOne", () => query(user));
  t.mock.method(Role, "findOne", (filter) => query(knownRoles[filter.key] || null));
  t.mock.method(ActivityLog, "create", async (input) => ({ _id: TARGET, ...input }));
  t.mock.method(bcrypt, "hash", async () => "hashed-password");
}
function jwtConfiguration(t, secret) {
  for (const [key, value] of Object.entries({ JWT_SECRET: secret, JWT_ISSUER: "inop", JWT_AUDIENCE: "inop-users" })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
}

test("permission resolution denies none and invalid scopes, even beneath a wildcard", () => {
  assert.equal(permissionScope([{ resource: "*", action: "*", scope: "all" },
    { resource: "user", action: "update", scope: "none" }], "user", "update"), null);
  assert.equal(permissionScope([{ resource: "user", action: "update", scope: "invalid" }], "user", "update"), null);
  assert.equal(permissionScope([{ resource: "user", action: "read", scope: "department" }], "user", "read"), "department");
});

test("HR may delegate employee self-service but not administrator or audit authority", () => {
  assert.equal(canDelegate(hr.permissions, employee.permissions), true);
  assert.equal(canDelegate(hr.permissions, admin.permissions), false);
  assert.equal(canDelegate(hr.permissions, [{ resource: "audit", action: "update", scope: "all" }]), false);
  assert.equal(canDelegate([
    { resource: "*", action: "*", scope: "all" },
    { resource: "candidate", action: "delete", scope: "none" },
  ], admin.permissions), false);
});

test("resource scope maps profile, department, activity logs, notifications and uploaded documents correctly", () => {
  const scope = (resource, value, user = { id: ACTOR, departmentId: TARGET }) =>
    getDataScope({ user, permission: { resource, scope: value } });
  assert.deepEqual(scope("user", "own"), { _id: ACTOR });
  assert.deepEqual(scope("profile", "own"), { _id: ACTOR });
  assert.deepEqual(scope("user", "assigned"), { managerId: ACTOR });
  assert.deepEqual(scope("department", "department"), { _id: TARGET });
  assert.equal(scope("department", "department", { departmentId: "legacy-id" }), null);
  assert.deepEqual(scope("activity_log", "own"), { userId: ACTOR });
  assert.deepEqual(scope("audit.notification", "own"), { userId: ACTOR });
  assert.deepEqual(scope("audit.source_document", "own"), { uploadedBy: ACTOR });
  assert.equal(scope("unknown_resource", "department"), null);
  for (const resource of ["audit.analytics", "audit.execution", "audit.workflow", "audit.export", "occupational_safety_details"]) {
    assert.deepEqual(scope(resource, "department"), { departmentId: TARGET });
  }
  assert.equal(scope("audit.unknown_resource", "department"), null);
  assert.equal(scope("user", "none"), null);
});

test("authorization retains both resource scopes when middleware chains are composed", async () => {
  const req = request({}, { authRole: { permissions: [
    { resource: "candidate", action: "create", scope: "department" },
    { resource: "application", action: "create", scope: "all" },
  ] } });
  const res = response();
  for (const middleware of [...authorize("candidate", "create"), ...authorize("application", "create")]) {
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }
  assert.deepEqual(req.authorizedScopes["candidate:create"].dataScope, { departmentId: "dep_hr" });
  assert.deepEqual(req.authorizedScopes["application:create"].dataScope, {});
});

test("requirePermission and requireAnyPermission refuse explicit none", async () => {
  const req = request({}, { authRole: { permissions: [{ resource: "user", action: "update", scope: "none" }] } });
  for (const middleware of [auth.requirePermission("user", "update"), auth.requireAnyPermission(["user.update"])]) {
    const res = response();
    await middleware(req, res, () => assert.fail("denied permissions must not call next"));
    assert.equal(res.statusCode, 403);
  }
});

test("department HR cannot promote themselves to admin", async (t) => {
  const user = document(t, { _id: ACTOR, role: "hr_manager" });
  mockModels(t, user);
  const res = response();
  await users.updateUser(request({ role: "admin" }, { params: { id: ACTOR } }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(user.save.mock.callCount(), 0);
  assert.equal(user.role, "hr_manager");
});

test("department HR cannot create administrators or users in other departments", async (t) => {
  mockModels(t);
  const create = t.mock.method(User, "create", async () => assert.fail("forbidden creation reached persistence"));
  for (const body of [
    { name: "Admin", email: "new@example.com", password: "validPassword123!", role: "admin", departmentId: "dep_hr" },
    { name: "Other", email: "new@example.com", password: "validPassword123!", role: "employee", departmentId: "dep_ops" },
  ]) {
    const res = response();
    await users.createUser(request(body), res);
    assert.equal(res.statusCode, 403);
  }
  assert.equal(create.mock.callCount(), 0);
});

test("department HR can create employee accounts within their department", async (t) => {
  mockModels(t);
  t.mock.method(Department, "exists", async () => ({ _id: TARGET }));
  const create = t.mock.method(User, "create", async (input) => ({ _id: TARGET, isActive: true, ...input }));
  const res = response();
  await users.createUser(request({ name: "Employee", email: "NEW@example.com", password: "validPassword123!", role: "employee", departmentId: TARGET }, {
    user: { id: ACTOR, role: "hr_manager", departmentId: TARGET }, dataScope: { departmentId: TARGET },
  }), res);
  assert.equal(res.statusCode, 201);
  assert.equal(create.mock.calls[0].arguments[0].email, "new@example.com");
  assert.equal(create.mock.calls[0].arguments[0].password, "hashed-password");
  assert.equal(res.body.user.password, undefined);
});

test("department HR cannot move employees outside their scope", async (t) => {
  const user = document(t);
  mockModels(t, user);
  const res = response();
  await users.updateUser(request({ departmentId: "dep_ops" }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(user.save.mock.callCount(), 0);
});

test("HR cannot reset protected administrator or peer HR passwords", async (t) => {
  for (const key of ["admin", "hr_manager"]) {
    const user = document(t, { role: key });
    mockModels(t, user);
    const res = response();
    await users.updateUser(request({ password: "reset123" }), res);
    assert.equal(res.statusCode, 403);
    assert.equal(user.save.mock.callCount(), 0);
    t.mock.reset();
  }
});

test("legitimate employee profile updates preserve sessions; password resets revoke them", async (t) => {
  const user = document(t, { tokenVersion: 4 });
  mockModels(t, user);
  let res = response();
  await users.updateUser(request({ position: "Recruiter" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.position, "Recruiter");
  assert.equal(user.tokenVersion, 4);
  res = response();
  await users.updateUser(request({ password: "replacement123" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(user.password, "hashed-password");
  assert.equal(user.tokenVersion, 5);
  assert.equal(res.body.user.tokenVersion, undefined);
});

test("own user scope is intersected with requested ID instead of replacing it", async (t) => {
  mockModels(t);
  const find = t.mock.method(User, "findOne", (filter) => { assert.deepEqual(filter, { $and: [{ _id: TARGET }, { _id: ACTOR }] }); return query(null); });
  const res = response();
  await users.getUserById(request({}, { dataScope: { _id: ACTOR } }), res);
  assert.equal(res.statusCode, 404);
  assert.equal(find.mock.callCount(), 1);
});

test("the last active administrator cannot be demoted, disabled, or deleted", async (t) => {
  const user = document(t, { role: "admin" });
  mockModels(t, user);
  t.mock.method(User, "exists", async () => null);
  const overrides = { authRole: admin, user: { id: ACTOR, role: "admin" }, permission: { scope: "all" }, dataScope: {} };
  for (const [handler, body] of [[users.updateUser, { role: "employee" }], [users.updateUserStatus, { isActive: false }], [users.deleteUser, {}]]) {
    const res = response();
    await handler(request(body, overrides), res);
    assert.equal(res.statusCode, 409);
  }
  assert.equal(user.save.mock.callCount(), 0);
  assert.equal(user.deleteOne.mock.callCount(), 0);
});

test("administrator invariant uses a shared lock and rechecks before persistence", async (t) => {
  let locked = false;
  let remaining = true;
  let releaseFirst;
  const deferred = new Promise((resolve) => { releaseFirst = resolve; });
  t.mock.method(Role, "findOneAndUpdate", async () => {
    if (locked) return null;
    locked = true;
    return { key: "admin" };
  });
  t.mock.method(Role, "updateOne", async () => { locked = false; });
  t.mock.method(User, "exists", async () => remaining);
  const first = mutateAdminSafely({ _id: ACTOR }, true, async () => { await deferred; remaining = false; });
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(mutateAdminSafely({ _id: TARGET }, true, () => assert.fail("concurrent mutation")), { statusCode: 409 });
  releaseFirst();
  await first;
  await assert.rejects(mutateAdminSafely({ _id: TARGET }, true, () => assert.fail("last admin mutation")), { statusCode: 409 });
  assert.equal(locked, false);
});

test("referenced custom role keys remain stable while display names remain editable", async (t) => {
  const role = document(t, { key: "custom", name: "Custom", permissions: [], isSystemRole: false });
  mockModels(t);
  t.mock.method(Role, "findById", () => query(role));
  t.mock.method(User, "exists", async () => ({ _id: TARGET }));
  t.mock.method(User, "countDocuments", async () => 1);
  const overrides = { authRole: admin, user: { id: ACTOR, role: "admin" } };
  let res = response();
  await rolesController.updateRole(request({ key: "renamed" }, overrides), res);
  assert.equal(res.statusCode, 409);
  assert.equal(role.key, "custom");
  assert.equal(role.save.mock.callCount(), 0);
  res = response();
  await rolesController.updateRole(request({ name: "New display name" }, overrides), res);
  assert.equal(res.statusCode, 200);
  assert.equal(role.name, "New display name");
});

test("canonical administrator permissions cannot be removed", async (t) => {
  const role = document(t, { ...admin, isSystemRole: true });
  mockModels(t);
  t.mock.method(Role, "findById", () => query(role));
  const res = response();
  await rolesController.updateRole(request({ permissions: [] }, { authRole: admin, user: { id: ACTOR, role: "admin" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(role.save.mock.callCount(), 0);
});

test("role creation cannot delegate permissions beyond the actor's authority", async (t) => {
  mockModels(t);
  const res = response();
  await rolesController.createRole(request({ name: "Escalation", key: "escalation", permissions: admin.permissions }), res);
  assert.equal(res.statusCode, 403);
});

test("JWT verification rejects invalid claims and stale sessions and accepts current sessions", async (t) => {
  const secret = "test-jwt-secret-at-least-32-characters";
  jwtConfiguration(t, secret);
  t.mock.method(User, "findById", () => query({ _id: ACTOR, role: "employee", isActive: true, tokenVersion: 3 }));
  t.mock.method(RevokedToken, "exists", async () => null);
  t.mock.method(Role, "findOne", (filter) => query(knownRoles[filter.key] || null));
  const sign = (version, options = {}) => jwt.sign({ id: ACTOR, tokenVersion: version }, secret, {
    expiresIn: "1h", issuer: "inop", audience: "inop-users", algorithm: "HS256", ...options,
  });
  for (const token of [sign(2), sign(3, { issuer: "wrong" }), sign(3, { audience: "wrong" }), sign(3, { algorithm: "HS384" })]) {
    const res = response();
    await auth.verifyToken({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail("invalid token accepted"));
    assert.equal(res.statusCode, 401);
  }
  let accepted = false;
  const req = { headers: { authorization: `Bearer ${sign(3)}` } };
  await auth.verifyToken(req, response(), () => { accepted = true; });
  assert.equal(accepted, true);
  assert.equal(req.user.id, ACTOR);
  assert.equal(req.user.tokenVersion, undefined);
});

test("login signs the current session version and rejects non-string credentials", async (t) => {
  const secret = "test-jwt-secret-at-least-32-characters";
  jwtConfiguration(t, secret);
  mockModels(t, document(t, { role: "admin", password: "hash", tokenVersion: 7 }));
  t.mock.method(bcrypt, "compare", async () => true);
  let res = response();
  await authController.login({ body: { email: { $ne: null }, password: ["bad"] } }, res);
  assert.equal(res.statusCode, 400);
  res = response();
  await authController.login({ body: { email: "admin@example.com", password: "valid-password" } }, res);
  assert.equal(res.statusCode, 200);
  const claims = jwt.verify(res.body.token, secret, { issuer: "inop", audience: "inop-users", algorithms: ["HS256"] });
  assert.equal(claims.tokenVersion, 7);
  assert.equal(res.body.user.password, undefined);
});

test("production bootstrap validates credentials without including input in errors", () => {
  assert.throws(() => validateBootstrapInput({}), /BOOTSTRAP_ADMIN_EMAIL/);
  assert.throws(() => validateBootstrapInput({ BOOTSTRAP_ADMIN_EMAIL: "admin@example.com", BOOTSTRAP_ADMIN_NAME: "Admin", BOOTSTRAP_ADMIN_PASSWORD: "weak" }), /BOOTSTRAP_ADMIN_PASSWORD/);
  assert.deepEqual(validateBootstrapInput({ BOOTSTRAP_ADMIN_EMAIL: " Admin@Example.com ", BOOTSTRAP_ADMIN_NAME: " Admin ", BOOTSTRAP_ADMIN_PASSWORD: "StrongPassword123!" }), {
    email: "admin@example.com", name: "Admin", password: "StrongPassword123!",
  });
});

test("new password limits count UTF-8 bytes to avoid bcrypt truncation", () => {
  assert.equal(validNewPassword("short123"), false);
  assert.equal(validNewPassword("a".repeat(72)), true);
  assert.equal(validNewPassword("a".repeat(73)), false);
  assert.equal(validNewPassword("🙂".repeat(18)), true);
  assert.equal(validNewPassword("🙂".repeat(19)), false);
  assert.throws(() => validateBootstrapInput({ BOOTSTRAP_ADMIN_EMAIL: "admin@example.com", BOOTSTRAP_ADMIN_NAME: "Admin", BOOTSTRAP_ADMIN_PASSWORD: "Aa1!" + "x".repeat(69) }), /72 UTF-8 bytes/);
});

test("login rejects overlong UTF-8 passwords before bcrypt can truncate them", async (t) => {
  const find = t.mock.method(User, "findOne", () => assert.fail("overlong credential reached database"));
  const res = response();
  await authController.login({ body: { email: "admin@example.com", password: "🙂".repeat(19) } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /72 UTF-8/);
  assert.equal(find.mock.callCount(), 0);
});

test("HR role choices contain assignable roles and counts only their department", async (t) => {
  mockModels(t);
  t.mock.method(Role, "find", () => query([admin, hr, employee].map((role, index) => ({ _id: `role-${index}`, isActive: true, ...role }))));
  t.mock.method(User, "aggregate", async (pipeline) => {
    assert.deepEqual(pipeline[0], { $match: { departmentId: "dep_hr" } });
    return [{ _id: "employee", count: 2 }];
  });
  const res = response();
  await rolesController.getRoles(request({}), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.roles.map((role) => role.key), ["employee"]);
  assert.equal(res.body.roles[0].userCount, 2);
});

test("departments expose the existing frontend id contract", async (t) => {
  t.mock.method(Department, "find", () => query([{ _id: TARGET, name: "Human Resources", description: "" }]));
  t.mock.method(Department, "countDocuments", async () => 1);
  const res = response();
  await departments.getDepartments(request({}), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.departments[0].id, TARGET);
});

test("department scope cannot replace the requested department identifier", async (t) => {
  t.mock.method(Department, "findOne", (filter) => {
    assert.deepEqual(filter, { $and: [{ _id: TARGET }, { _id: ACTOR }] });
    return query(null);
  });
  const res = response();
  await departments.getDepartmentById(request({}, { dataScope: { _id: ACTOR } }), res);
  assert.equal(res.statusCode, 404);
});

test("department deletion preserves references from employees and recruitment records", async (t) => {
  const department = document(t, { name: "HR" });
  t.mock.method(Department, "findOne", () => query(department));
  for (const model of [User, Job, Candidate, Application]) t.mock.method(model, "exists", async () => model === Candidate ? { _id: TARGET } : null);
  const res = response();
  await departments.deleteDepartment(request({}), res);
  assert.equal(res.statusCode, 409);
  assert.equal(department.deleteOne.mock.callCount(), 0);
});

test("bootstrap refuses to overwrite an existing active administrator and releases its lock", async (t) => {
  t.mock.method(mongoose, "connect", async () => mongoose);
  t.mock.method(mongoose, "disconnect", async () => undefined);
  t.mock.method(Role, "findOneAndUpdate", async () => ({ ...admin, isActive: true, isSystemRole: true }));
  const unlock = t.mock.method(Role, "updateOne", async () => undefined);
  t.mock.method(User, "exists", async () => ({ _id: TARGET }));
  const create = t.mock.method(User, "create", async () => assert.fail("existing administrator overwritten"));
  await assert.rejects(bootstrapAdmin({ MONGO_URI: "mongodb://localhost/test", BOOTSTRAP_ADMIN_EMAIL: "new@example.com", BOOTSTRAP_ADMIN_NAME: "Admin", BOOTSTRAP_ADMIN_PASSWORD: "StrongPassword123!" }), /active administrator already exists/);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(unlock.mock.callCount(), 1);
});

test("unknown email login performs a bcrypt comparison before returning generic invalid credentials", async (t) => {
  t.mock.method(User, "findOne", () => query(null));
  const compare = t.mock.method(bcrypt, "compare", async () => false);
  const res = response();
  await authController.login({ body: { email: "unknown@example.com", password: "valid-password123" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(compare.mock.callCount(), 1);
});

test("administrator user creation rejects newly selected missing, legacy or inactive departments", async (t) => {
  mockModels(t);
  t.mock.method(Department, "exists", async (filter) => {
    assert.equal(filter.isActive, true);
    return null;
  });
  const create = t.mock.method(User, "create", async () => assert.fail("invalid department reached persistence"));
  for (const departmentId of ["dep_hr", TARGET]) {
    const res = response();
    await users.createUser(request({ name: "Employee", email: "new@example.com", password: "validPassword123!", role: "employee", departmentId }, {
      user: { id: ACTOR, role: "admin" }, authRole: admin, permission: { scope: "all" }, dataScope: {},
    }), res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(create.mock.callCount(), 0);
});

test("new department-scoped accounts require a selected department", async (t) => {
  mockModels(t);
  const res = response();
  await users.createUser(request({ name: "HR", email: "new@example.com", password: "validPassword123!", role: "hr_manager", departmentId: "" }, {
    user: { id: ACTOR, role: "admin" }, authRole: admin, permission: { scope: "all" }, dataScope: {},
  }), res);
  assert.equal(res.statusCode, 400);
});

test("changing an existing user's department must reference an active record", async (t) => {
  const user = document(t);
  mockModels(t, user);
  t.mock.method(Department, "exists", async () => null);
  const res = response();
  await users.updateUser(request({ departmentId: TARGET }, {
    user: { id: ACTOR, role: "admin" }, authRole: admin, permission: { scope: "all" }, dataScope: {},
  }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(user.save.mock.callCount(), 0);
  assert.equal(user.departmentId, "dep_hr");
});

test("paginated user responses preserve the envelope, scope, and permission mapping", async (t) => {
  const values = [{ _id: TARGET, name: "Employee", role: "employee", email: "employee@example.com", isActive: true }];
  const expectedFilter = { $and: [{ departmentId: "dep_hr" }, {}] };
  t.mock.method(User, "find", (filter) => {
    assert.deepEqual(filter, expectedFilter);
    const result = query(values);
    result.skip = (offset) => { assert.equal(offset, 2); return result; };
    result.limit = (limit) => { assert.equal(limit, 2); return result; };
    return result;
  });
  t.mock.method(User, "countDocuments", async (filter) => { assert.deepEqual(filter, expectedFilter); return 4; });
  t.mock.method(Role, "find", () => query([employee]));
  const res = response();
  await users.getUsers(request({}, { query: { page: "2", limit: "2" } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.users[0].id, TARGET);
  assert.deepEqual(res.body.users[0].permissions, employee.permissions);
  assert.equal(res.headers["X-Total-Count"], "4");
  assert.equal(res.headers["X-Next-Page"], "3");
});

test("activity pagination keeps department scope and existing response shape", async (t) => {
  const expectedFilter = { $and: [{ departmentId: "dep_hr" }, {}] };
  t.mock.method(ActivityLog, "find", (filter) => {
    assert.deepEqual(filter, expectedFilter);
    return query([{ _id: TARGET, userId: ACTOR, userName: "HR", action: "create", entityType: "user", description: "Created employee" }]);
  });
  t.mock.method(ActivityLog, "countDocuments", async () => 1);
  const res = response();
  await activity.getActivityLogs(request({}), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.activityLogs[0].id, TARGET);
  assert.equal(res.body.activityLogs[0].userId, ACTOR);
  assert.equal(res.headers["X-Total-Count"], "1");
});

test("invalid pagination returns a client error before querying user records", async (t) => {
  t.mock.method(User, "find", () => assert.fail("invalid pagination reached database"));
  const res = response();
  await users.getUsers(request({}, { query: { page: "0" } }), res);
  assert.equal(res.statusCode, 400);
});
