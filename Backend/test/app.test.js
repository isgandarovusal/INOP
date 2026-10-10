const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { createApp, validateEnvironment } = require("../app");

async function serve(t, database = { readyState: 1 }) {
  const app = createApp({ env: { NODE_ENV: "production", CORS_ORIGINS: "https://inop.example" }, database });
  const server = await new Promise(resolve => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test("health follows database readiness and production hides documentation", async t => {
  const database = { readyState: 1 };
  const url = await serve(t, database);
  let response = await fetch(`${url}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, status: "ok" });
  assert.equal(response.headers.has("x-powered-by"), false);
  assert.ok(response.headers.get("x-request-id"));
  database.readyState = 0;
  response = await fetch(`${url}/health`);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).success, false);
  assert.equal((await fetch(`${url}/api-docs`)).status, 404);
});

test("private files and previously unmounted audit actions require a bearer token", async t => {
  const url = await serve(t);
  for (const route of ["/uploads/example.pdf", "/api/audit-actions/audit/507f1f77bcf86cd799439011", "/api/audit-execution/507f1f77bcf86cd799439011"]) {
    const response = await fetch(`${url}${route}`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
  }
});

test("CORS permits configured origins and rejects arbitrary origins", async t => {
  const url = await serve(t);
  const allowed = await fetch(`${url}/health`, { headers: { Origin: "https://inop.example" } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://inop.example");
  assert.match(allowed.headers.get("access-control-expose-headers"), /X-Next-Page/);
  const denied = await fetch(`${url}/health`, { headers: { Origin: "https://attacker.example" } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.has("access-control-allow-origin"), false);
});

test("JSON errors are standardized and input size is bounded", async t => {
  const url = await serve(t);
  const request = body => fetch(`${url}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  for (const body of ["{", "[]", "null"]) {
    const response = await request(body);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).success, false);
  }
  assert.equal((await request(JSON.stringify({ payload: "x".repeat(1024 * 1024) }))).status, 413);
});

test("repeated failed logins are throttled without requiring a database query", async t => {
  const url = await serve(t);
  for (let i = 0; i < 15; i++) {
    const response = await fetch(`${url}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(response.status, 400);
  }
  const response = await fetch(`${url}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("retry-after"));
});

test("startup rejects missing configuration and weak keys with a failing exit status", () => {
  assert.throws(() => validateEnvironment({ MONGO_URI: "mongodb://127.0.0.1/test", JWT_SECRET: "short" }), /32/);
  assert.throws(() => validateEnvironment({ MONGO_URI: "mongodb://127.0.0.1/test", JWT_SECRET: "a".repeat(32), TRUST_PROXY: "true" }), /proxy/);
  const result = spawnSync(process.execPath, [path.resolve(__dirname, "../server.js")], {
    env: { ...process.env, MONGO_URI: "", CS: "", JWT_SECRET: "" }, encoding: "utf8", timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /startup failed/);
});
