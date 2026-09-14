const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-that-is-long-enough";

const app = require("../app");

async function withServer(callback) {
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("health endpoint is available without MongoDB", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
  });
});

test("login validates missing credentials before database access", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const body = await response.json();
    assert.equal(response.status, 400);
    assert.match(body.message, /Email/);
  });
});

test("Swagger JSON is available", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api-docs/swagger.json`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.info.title, "INOP — Internal Operations Platform API");
  });
});
