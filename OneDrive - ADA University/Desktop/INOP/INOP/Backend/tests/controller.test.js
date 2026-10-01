const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
function load(file, deps) {
  const exports = {};
  const module = { exports };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
    {
      exports,
      module,
      require: (n) => {
        if (n in deps) return deps[n];
        throw Error(n);
      },
      console,
      Date,
      String,
    },
  );
  return module.exports;
}
function response() {
  return {
    statusCode: 200,
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
}
test("Assigned scope module lists apply scope to database query", async () => {
  let filter;
  const c = load("controllers/auditModule.controller.js", {
    "../models/audit.model": {
      find: (q) => (
        (filter = q),
        {
          skip() {
            return this;
          },
          limit() {
            return this;
          },
          sort: async () => [],
        }
      ),
    },
    "../middleware/auditScope.middleware": {
      getAssignedAuditFilter: async () => ({ auditorId: "me" }),
    },
  });
  await c.getStandardAudits({ query: {}, user: { id: "me" } }, response());
  assert.equal(filter.$and[1].auditorId, "me");
});
test("Approval POST cannot inject approved status", async () => {
  let created;
  const c = load("controllers/auditApproval.controller.js", {
    "../models/auditApproval.model": {
      exists: () => ({ session: async () => null }),
      create: async (rows) => ((created = rows[0]), rows),
    },
    "../models/user.model": { findOne: async () => ({ _id: "reviewer" }) },
    "../models/auditExecution.model": {
      exists: () => ({ session: async () => true }),
    },
    "../services/auditMutation.service": {
      mutate: async (req, r, a, fn) => fn({}, req.audit),
    },
    "../services/policy.service": require("../services/policy.service"),
  });
  const res = response();
  await c.createApproval(
    {
      body: { reviewer: "reviewer", status: "approved" },
      user: { id: "auditor" },
      audit: { _id: "audit", auditorId: "auditor" },
    },
    res,
    (e) => {
      throw e;
    },
  );
  assert.equal(res.statusCode, 201);
  assert.equal(created.status, "pending");
  assert.equal(created.requestedBy, "auditor");
});
test("Approval rejects self-review", async () => {
  const c = load("controllers/auditApproval.controller.js", {
    "../models/auditApproval.model": {},
    "../models/user.model": { findOne: async () => ({ _id: "auditor" }) },
    "../models/auditExecution.model": {},
    "../services/auditMutation.service": {},
    "../services/policy.service": require("../services/policy.service"),
  });
  let error;
  await c.createApproval(
    {
      body: { reviewer: "auditor" },
      user: { id: "auditor" },
      audit: { auditorId: "auditor" },
    },
    response(),
    (e) => {
      error = e;
    },
  );
  assert.equal(error.statusCode, 400);
});
test("Notification own-scope rejects a different recipient", async () => {
  let sent = false;
  const c = load("controllers/auditNotification.controller.js", {
    mongoose: { Types: { ObjectId: { isValid: () => true } } },
    "../models/auditNotification.model": {},
    "../models/user.model": {
      findOne: () => ({
        select: () => ({ lean: async () => ({ _id: "other" }) }),
      }),
    },
    "../services/notification.service": {
      notifyUser: async () => {
        sent = true;
      },
    },
    "../middleware/auditScope.middleware": {
      findAuditByIdentifier: async () => ({ _id: "audit" }),
      userHasAuditAccess: async () => true,
    },
  });
  const res = response();
  await c.createNotification(
    {
      user: { id: "me" },
      permission: { scope: "own" },
      body: { auditId: "audit", userId: "other" },
    },
    res,
  );
  assert.equal(res.statusCode, 403);
  assert.equal(sent, false);
});
test("Closure refuses missing approval", async () => {
  const chain = (value) => ({
    session: async () => value,
    sort() {
      return this;
    },
  });
  const c = load("controllers/auditClosure.controller.js", {
    mongoose: { connection: { transaction: async (fn) => fn({}) } },
    "../models/audit.model": {
      findById: () => chain({ _id: "a", status: "in-progress", revision: 1 }),
      updateOne: async () => {},
    },
    "../models/auditClosure.model": { findOne: () => chain(null) },
    "../models/auditApproval.model": { findOne: () => chain(null) },
    "../models/auditFinding.model": { exists: () => chain(null) },
    "../models/auditAction.model": { exists: () => chain(null) },
    "../models/auditExecution.model": { findOne: () => chain({ _id: "e" }) },
    "../models/auditActivity.model": {},
    "../services/policy.service": require("../services/policy.service"),
  });
  let error;
  await c.closeAudit(
    { audit: { _id: "a" }, user: { id: "me" }, body: {} },
    response(),
    (e) => {
      error = e;
    },
  );
  assert.equal(error.statusCode, 409);
  assert.match(error.message, /approval/);
});
test('Child authorization resolves the approval parent, not the approval id',async()=>{const chain=value=>({lean:async()=>value});const c=load('middleware/auditScope.middleware.js',{'mongoose':{isValidObjectId:()=>true},'../models/audit.model':{},'../models/auditAssignment.model':{},'../models/auditApproval.model':{findById:()=>chain({auditId:'parent-audit'})}});const req={params:{id:'approval-id'},permission:{resource:'audit.approval'},body:{auditId:'spoofed-parent'}};assert.equal(await c.getAuditIdFromRequest(req),'parent-audit')});
