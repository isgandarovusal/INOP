# INOP — Internal Operations Platform

INOP supports recruitment and internal audit workflows. The API uses Express, Mongoose, JWT authorization, and MongoDB. The browser application uses React, TypeScript, and Vite.

## Backend development

Use Node.js **24 LTS**, npm 11 or newer, and MongoDB 7. `Backend/.nvmrc` pins the Node major version. Use the existing checkout for cloud tasks; each task already has an isolated workspace.

```sh
cd Backend
nvm use                         # if nvm is installed
npm ci
cp .env-example .env            # only when .env does not already exist
```

Edit the local `.env` file using the template. Set `MONGO_URI`, `JWT_SECRET`, and the browser origins in `CORS_ORIGINS`. Generate a unique JWT secret with `openssl rand -hex 32`; the server requires at least 32 characters. Keep secrets in an ignored local file or deployment secret manager. Existing environment variables take precedence over `.env`.

```sh
npm run seed:roles
npm run bootstrap:admin
npm run dev
```

The administrator bootstrap requires `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters and at most 72 UTF-8 bytes, with uppercase, lowercase, a number, and a symbol) in the process environment or local `.env`. It refuses to create another account when an active administrator already exists. After bootstrap, remove these credentials from the runtime environment. Additional users can then be created through authorized user-management endpoints.

`npm run seed:users` creates demonstration accounts and their departments for an isolated development database only. It does not run during application startup and refuses production mode. The demo accounts share the repository's documented development password `password123`; never expose a database containing them to real users. `npm run seed:roles` inserts missing system roles and preserves existing role definitions and permissions.

The API listens on port 3001 by default. `/health` reports application/database readiness. Set `ENABLE_API_DOCS=true` to enable the existing Swagger documentation in a trusted development environment. SMTP is optional; configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to send recruitment notifications.

After upgrading from the previous token format, users must sign in again: JWT verification now requires issuer, audience, and the current user-session version. Password resets and changes to a user's role invalidate their existing sessions.

## Validation and dependency maintenance

```sh
cd Backend
npm run check
npm test
npm audit --audit-level=moderate
```

The Node test runner covers security boundaries and API contracts without requiring a production database. The GitHub workflow installs the frozen backend lockfile, checks JavaScript syntax, runs regression and live database integration tests against a MongoDB 7 service, and checks dependency advisories. To run the integration checks locally, set `TEST_MONGO_URI` to a development MongoDB instance before `npm test`; the suite creates and removes its own randomly named test database.

Development watch mode uses Node's built-in watcher. Excel exports use `write-excel-file` with explicit cell types; uploaded strings cannot become spreadsheet formulas. Mammoth's command-line parser is overridden to `argparse` 2.0.1, which retains its legacy API compatibility and removes the vulnerable `sprintf-js` dependency. Regression tests exercise both DOCX extraction and the Mammoth CLI. Keep these tests when upgrading dependencies; do not apply unchecked cross-major overrides or disable signature, checksum, or TLS verification.

## Docker deployment

Create `Backend/.env` from its template without replacing an existing file. Set a fresh JWT secret and your exact deployed browser origin. Create the upload directory and grant the container's UID/GID 1000 read/write access. Preserve its existing files; `UPLOADS_VOLUME_PATH` can point Compose to an existing compatible storage directory.

```sh
docker compose --env-file Backend/.env config --quiet
docker compose --env-file Backend/.env up --build -d
docker compose --env-file Backend/.env exec backend npm run db:indexes
docker compose --env-file Backend/.env exec backend npm run seed:roles
docker compose --env-file Backend/.env exec backend npm run bootstrap:admin
```

Supply the bootstrap variables securely to the initial backend process before the final command, then remove them from the persistent configuration and recreate that service. The backend image uses Node 24, `npm ci`, and a non-root user. Production mode disables automatic index creation; `db:indexes` adds the declared indexes without dropping existing indexes. Run it after model/index updates. Duplicate records can prevent unique-index creation; resolve the affected data explicitly before retrying.

For a trusted registry proxy with a private certificate authority, BuildKit accepts an optional `npm_ca` build secret containing its public CA certificate. It is read only during `npm ci` and is not stored in the image. For example: `docker build --secret id=npm_ca,src=/path/to/trusted-ca.crt Backend`. Pass proxy settings through Docker's standard `HTTP_PROXY`/`HTTPS_PROXY` build arguments when needed. Keep TLS verification enabled.

The application is available at `http://localhost:3000` by default. Compose builds the unchanged frontend with a relative `/api` base URL and mounts `infra/nginx.conf` for API/upload proxying. The browser therefore reaches the deployed API through its own origin. MongoDB and the direct backend port bind to localhost; the frontend waits for a healthy backend, and the backend waits for MongoDB. Compose uses the existing upload bind mount and the persistent `mongo-data` volume. Do not use `docker compose down --volumes` when preserving data.

`BACKEND_ENV_FILE` can select a different backend environment file for Compose and maintenance scripts. Pass the same file to `--env-file` so Compose interpolation also receives its values. `FRONTEND_PORT`, `BACKEND_PORT`, and `MONGO_PORT` customize host ports. `TRUST_PROXY=1` in Compose corresponds to the single Nginx proxy; direct development uses 0. Terminate HTTPS at your deployment ingress and set the allowed browser origin to the external HTTPS origin. Store database and upload backups together.

Compose limits the backend container to 768 MB of memory, two CPUs, and 128 processes/threads. The memory cap includes CV workers and their native PDF allocations, which worker V8 heap limits do not cover. Adjust `BACKEND_MEMORY_LIMIT` and `BACKEND_CPUS` for your workload and available host resources; change `pids_limit` deliberately if the process/thread budget needs to increase.

## API contracts and remaining browser work

Protected endpoints and `/uploads` require a valid `Authorization: Bearer <token>` header and the relevant record scope. A public file URL alone does not grant access. Some existing frontend audit services use raw `fetch` or `window.open` without that header; those browser flows still require a separate frontend task. This backend maintenance does not modify any files under `Frontend` or relax authorization to accommodate missing client credentials.

Collection endpoints that implement `limit`/`page` keep their existing array response shapes. Their default maximum is 1000 rows; request subsequent pages explicitly and use `X-Total-Count` and `X-Next-Page` response headers where provided. The existing browser does not yet provide pagination controls for all these screens.

Audit attachments must refer to persisted, authorized uploaded files. Browser-only `blob:` URLs cannot be saved as shareable attachments; the browser must upload the file contents. Audit execution accepts the supported answer payload and the legacy `value` alias, and computes scores from the stored checklist instead of trusting client-supplied scores. Approval and completion require the configured review and finding/action conditions to pass.

Source-document/template mutations and execution creation use a shared database lease for the audit library. Concurrent changes cannot delete evidence between execution validation and persistence. Executed templates and their referenced source documents retain their evidence rather than being removed by a conflicting library update.

Recruitment candidate/job deletion is a soft deletion: deleted records are excluded from normal lists and new applications, while existing application references and authorized historical CV access are retained. There is no automatic permanent purge. Implement any employee/candidate retention policy through a separately reviewed data-retention operation with backups.

Audit and restaurant deletion also preserves historical records and related evidence through soft deletion. Deleted records are excluded from normal lists and new work, while authorized historical reports can retain the evidence they reference. Permanent removal requires a separate controlled retention operation.

## Structure

```text
Backend/                  API, models, middleware, services, maintenance scripts
Backend/test/             Node regression tests
Frontend/                 Existing React application
infra/nginx.conf          Deployment proxy configuration
docker-compose.yml        MongoDB, API, and browser services
.github/workflows/        Automated backend validation
```
