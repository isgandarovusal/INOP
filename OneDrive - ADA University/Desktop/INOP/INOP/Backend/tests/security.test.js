const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  checkUserChange,
  requireManager,
} = require("../services/policy.service");
const {
  payload,
  transition,
  executionScore,
  calculateScore,
} = require("../services/auditDomain.service");
const { roles } = require("../scripts/seedRoles");
const hr = { user: { id: "hr", role: "hr_manager", departmentId: "hr" } };
test("HR cannot create an administrator", () =>
  assert.throws(() =>
    checkUserChange(hr, null, { role: "admin", departmentId: "hr" }),
  ));
test("HR cannot promote itself or modify a privileged peer", () =>
  assert.throws(() =>
    checkUserChange(hr, { role: "hr_manager" }, { role: "admin" }),
  ));
test("HR cannot create a user in another department", () =>
  assert.throws(() =>
    checkUserChange(hr, null, { role: "employee", departmentId: "finance" }),
  ));
test("HR can create an employee in its department", () =>
  assert.doesNotThrow(() =>
    checkUserChange(hr, null, { role: "employee", departmentId: "hr" }),
  ));
test("Auditor cannot assign itself despite legacy broad grants", () =>
  assert.throws(() => requireManager({ user: { role: "auditor" } })));
test("Seed auditor has no assignment-create permission", () =>
  assert(
    !roles
      .find((r) => r.key === "auditor")
      .permissions.some(
        (p) => p.resource === "audit.assignment" && p.action === "create",
      ),
  ));
test("Seed auditor listings are assigned-scoped", () =>
  assert.equal(
    roles
      .find((r) => r.key === "auditor")
      .permissions.find(
        (p) => p.resource === "audit.analytics" && p.action === "read",
      ).scope,
    "assigned",
  ));
test("Workflow cannot complete an audit directly", () =>
  assert.throws(() => transition("in-progress", "completed")));
test("Closed audits cannot return to draft", () =>
  assert.throws(() => transition("completed", "draft")));
test("Draft can begin execution", () =>
  assert.doesNotThrow(() => transition("draft", "in-progress")));
test("Audit payload rejects impossible dates", () =>
  assert.throws(() =>
    payload({ auditType: "service", restaurantId: "r", date: "2026-02-31" }),
  ));
test("Audit payload ignores client status, score summary, actors and file references", () => {
  const r = payload({
    auditType: "service",
    restaurantId: "r",
    date: "2026-09-28",
    checks: [{ answer: "no" }],
    overallPercentage: 100,
    status: "completed",
    auditorId: "other",
    photos: [{ blobUrl: "blob:fake" }],
  });
  assert.equal(r.overallPercentage, 0);
  assert.equal(r.status, undefined);
  assert.equal(r.auditorId, undefined);
  assert.equal(r.photos, undefined);
});
test("Out-of-range safety scores rejected", () =>
  assert.throws(() =>
    calculateScore({
      auditType: "occupational-safety",
      checks: [{ score: 999 }],
    }),
  ));
test("Legacy checklist is used when checks is empty", () =>
  assert.equal(
    calculateScore({
      auditType: "service",
      checks: [],
      checklist: [{ status: "passed" }],
    }),
    100,
  ));
test("Client execution score cannot override server score", () => {
  const r = executionScore(
    [{ id: "a", answerType: "yes-no-na", required: true }],
    [{ questionId: "a", answer: "no", score: 10000 }],
  );
  assert.equal(r.totalScore, 0);
  assert.equal(r.answers[0].score, 0);
});
test("Omitted execution answers rejected", () =>
  assert.throws(() =>
    executionScore([{ id: "a", answerType: "yes-no-na", required: true }], []),
  ));
test("Execution score denominator excludes N/A", () =>
  assert.equal(
    executionScore(
      [
        { id: "a", answerType: "yes-no-na" },
        { id: "b", answerType: "yes-no-na" },
      ],
      [{ answer: "yes" }, { answer: "na" }],
    ).totalScore,
    100,
  ));
test("Execution score answers enforce bounds", () =>
  assert.throws(() =>
    executionScore([{ id: "a", answerType: "score" }], [{ answer: "999" }]),
  ));
test("Execution mismatched question identity rejected", () =>
  assert.throws(() =>
    executionScore(
      [{ id: "a", answerType: "score" }],
      [{ questionId: "other", answer: "5" }],
    ),
  ));
test("All role permissions have known scope", () =>
  assert(
    roles.every((r) =>
      r.permissions.every((p) =>
        ["all", "own", "assigned", "department"].includes(p.scope),
      ),
    ),
  ));
