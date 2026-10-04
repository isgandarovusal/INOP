const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
process.env.JWT_SECRET = "test-secret-for-unit-http-checks-only-123456789";
const { createApp, validateEnvironment } = require("../server");
let server, base;
before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
for (const path of [
  "/api/audits",
  "/api/audit-execution/123",
  "/api/audit-actions/audit/123",
  "/api/files/test.pdf",
  "/api/candidates",
  "/api/dashboard",
])
  test(`Anonymous access denied: ${path}`, async () => {
    const r = await fetch(base + path);
    assert.equal(r.status, 401);
  });
test("Legacy public upload endpoint does not expose files", async () => {
  const r = await fetch(base + "/uploads/test.pdf");
  assert.equal(r.status, 404);
});
test("Readiness reports disconnected database", async () => {
  const r = await fetch(base + "/ready");
  assert.equal(r.status, 503);
});
test("Missing secret fails startup validation", () => {
  const old = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  assert.throws(validateEnvironment, /JWT_SECRET/);
  process.env.JWT_SECRET = old;
});
test("Malformed token fails without reaching database", async () => {
  const r = await fetch(base + "/api/candidates", {
    headers: { authorization: "Bearer invalid" },
  });
  assert.equal(r.status, 401);
});
