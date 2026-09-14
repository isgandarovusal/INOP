const BASE_URL = String(
  process.env.BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return { response, body };
}

async function main() {
  const health = await request("/health");

  if (!health.response.ok) {
    throw new Error(`Health check failed: ${health.response.status}`);
  }

  const swagger = await request("/api-docs/swagger.json");

  if (!swagger.response.ok) {
    throw new Error(`Swagger check failed: ${swagger.response.status}`);
  }

  console.log("PASS health + Swagger");

  if (!EMAIL || !PASSWORD) {
    console.log(
      "SKIP authenticated smoke tests. Set TEST_EMAIL and TEST_PASSWORD."
    );
    return;
  }

  const login = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!login.response.ok || !login.body?.token) {
    throw new Error(
      `Login smoke test failed: ${login.response.status} ${JSON.stringify(login.body)}`
    );
  }

  const authHeaders = {
    Authorization: `Bearer ${login.body.token}`,
  };

  for (const path of ["/api/auth/me", "/api/jobs", "/api/candidates", "/api/applications"]) {
    const result = await request(path, { headers: authHeaders });

    if (!result.response.ok) {
      throw new Error(`${path} failed: ${result.response.status}`);
    }

    console.log(`PASS ${path}`);
  }

  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: authHeaders,
  });

  if (!logout.response.ok) {
    throw new Error(`Logout failed: ${logout.response.status}`);
  }

  console.log("PASS logout");
}

main().catch((error) => {
  console.error("Smoke test failed:", error.message);
  process.exit(1);
});
