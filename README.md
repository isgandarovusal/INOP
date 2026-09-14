# INOP — Internal Operations Platform

INOP is a React + Node.js platform for recruitment/ATS workflows and operational audit management. The project contains a Vite/React frontend and an Express/MongoDB backend with JWT authentication, permission-based RBAC, candidate/job/application management, CV processing, audit workflows, analytics, notifications and exports.

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, react-i18next, Recharts
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Security:** JWT, bcrypt, Helmet, rate limiting, permission/data-scope authorization
- **Files/CV:** Multer, PDF parsing, DOCX parsing
- **Notifications:** Nodemailer/SMTP with delivery logs
- **Exports:** PDFKit, XLSX, CSV
- **API docs:** Swagger/OpenAPI

## Project structure

```text
Backend/
  app.js                 Express application/middleware
  server.js              MongoDB connection + HTTP server startup
  controllers/           API business logic
  middleware/            auth, RBAC, data scope, file upload, error handling
  models/                Mongoose models
  routes/                API routes
  services/              CV parsing, matching, email/notifications
  scripts/               seed, syntax check and smoke-test scripts
  tests/                 backend unit/application tests
Frontend/
  src/                    React application
```

## Backend setup

Requirements: Node.js 20+ and MongoDB 7+ (or a MongoDB Atlas URI).

```bash
cd Backend
cp .env-example .env
npm install
```

Edit `Backend/.env` and at minimum set:

```env
MONGO_URI=mongodb://localhost:27017/inop
JWT_SECRET=<long-random-secret>
PORT=3001
```

Then seed roles:

```bash
npm run seed:roles
```

To create/update demo users, set the `SEED_*_PASSWORD` variables in `.env` first and run:

```bash
npm run seed:users
```

Passwords are intentionally **not hardcoded** in the repository.

Start the backend:

```bash
npm run dev
```

- API: `http://localhost:3001/api`
- Health: `http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/api-docs`
- OpenAPI JSON: `http://localhost:3001/api-docs/openapi.json`

## Authentication and authorization

Login:

```http
POST /api/auth/login
```

Authenticated requests use:

```http
Authorization: Bearer <token>
```

Logout revokes the current JWT until its original expiration time:

```http
POST /api/auth/logout
```

Roles and permissions are seeded by `Backend/scripts/seedRoles.js`. Data access can be scoped to `all`, `department`, `assigned`, or `own` where the resource supports that scope.

## Recruitment backend

Main endpoints include:

- Jobs: `/api/jobs`
- Candidates: `/api/candidates`
- Applications: `/api/applications`
- CV preview/parser: `POST /api/candidates/parse-cv`
- Full CV pipeline: `POST /api/candidates/from-cv`
- Candidate exports: `/api/candidate-export/*`
- Candidate email logs: `GET /api/notification-logs`

### Full CV pipeline

`POST /api/candidates/from-cv` accepts multipart form-data with `cv` (PDF/DOCX). Optional fields can override extracted values. If `jobId` is included, the backend also creates an Application and calculates the Match Score from the CV-derived candidate data.

Flow:

```text
CV upload
  -> PDF/DOCX text extraction
  -> structured candidate extraction
  -> Candidate creation
  -> optional Job match calculation
  -> optional Application creation
```

### Candidate status email notifications

When an Application changes to `Interview`/`Offered`, or the Candidate Kanban status changes directly to `interview`/`offer`, the backend:

1. synchronizes the related Candidate ATS status;
2. attempts to send an SMTP email to the candidate;
3. records `sent`, `skipped`, or `failed` in `NotificationLog`.

If SMTP is not configured, the status update still succeeds and the email is logged as skipped.

## Candidate and audit exports

Candidate exports:

```http
GET /api/candidate-export/csv
GET /api/candidate-export/excel
GET /api/candidate-export/:candidateId/pdf
```

CSV/Excel candidate exports support query filters:

- `status`
- `role`
- `q`
- `from`
- `to`

Audit exports:

```http
GET /api/audit-export/list/csv
GET /api/audit-export/list/excel
GET /api/audit-export/:auditId/csv
GET /api/audit-export/:auditId/excel
GET /api/audit-export/:auditId/pdf
```

Filtered audit list exports support `status`, `auditType`, `restaurantId`, `auditorId`, `from`, and `to`.

## Audit backend

The backend contains APIs for:

- Standard Audit
- Service Audit
- Occupational Safety Audit
- Audit assignments
- Findings
- Corrective actions
- Audit executions
- Approvals and closure
- Timeline/activity
- Notifications
- Reports and score/workflow operations
- Dashboard and analytics

The previously standalone Audit Action and Audit Execution route modules are mounted at:

```http
/api/audit-actions
/api/audit-executions
```

Assigned-auditor authorization resolves the child action/execution back to its parent Audit before allowing access.

## Audit dashboard filters

`GET /api/audit-dashboard` uses real MongoDB data and supports:

- `status`
- `auditType`
- `auditorId`
- `restaurantId`
- `from`
- `to`

It returns totals, completed executions, average execution score, risk/type/status/auditor distributions and monthly trend data.

## Error handling and file validation

The backend has centralized API handling for:

- 404 endpoints
- unhandled 500 errors
- Mongoose validation and CastError
- duplicate-key errors
- Multer/file upload errors
- file-size errors
- invalid/unsupported CV uploads

CV uploads accept PDF/DOCX up to 5 MB.

## Email configuration

Email is optional for local development. Configure these values to enable delivery:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_SECURE=false
```

## Tests and validation

After installing backend dependencies:

```bash
cd Backend
npm test
npm run check
```

`npm run check` syntax-checks all backend JavaScript files.

For a running backend, a smoke test is also available:

```bash
BASE_URL=http://localhost:3001 \
TEST_EMAIL=admin@inop.com \
TEST_PASSWORD='<your seed password>' \
npm run smoke
```

The smoke test checks health, Swagger, login, `/auth/me`, Jobs, Candidates, Applications and logout.

## Docker Compose

From the repository root:

```bash
docker compose up --build
```

Default local ports:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- MongoDB: `mongodb://localhost:27017`

For production, replace the development JWT secret and configure restricted `CORS_ORIGIN`, production MongoDB credentials and SMTP credentials through the deployment environment.

## Finalization notes

The backend now includes the finalization items from the project report: JWT logout/revocation, corrected RBAC seed role, mounted audit Action/Execution APIs, centralized error handling, CV-to-candidate/application pipeline, candidate Interview/Offer emails with logs, candidate exports, filtered audit exports, scoped/filterable audit dashboard analytics, environment documentation, backend tests and smoke-test tooling.

A true final end-to-end acceptance test still requires a running MongoDB instance plus the deployed frontend/backend environment, because deployment credentials and production infrastructure are environment-specific.
