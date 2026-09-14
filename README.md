# INOP — Internal Operations Platform

INOP is a React + Node.js platform for recruitment/ATS workflows and operational audit management. The project contains a Vite/React frontend and an Express/MongoDB backend with JWT authentication, permission-based RBAC, candidate/job/application management, CV processing, audit workflows, analytics, notifications and exports.

## Technology

<<<<<<< HEAD
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, react-i18next, Recharts
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Security:** JWT, bcrypt, Helmet, rate limiting, permission/data-scope authorization
- **Files/CV:** Multer, PDF parsing, DOCX parsing
- **Notifications:** Nodemailer/SMTP with delivery logs
- **Exports:** PDFKit, XLSX, CSV
- **API docs:** Swagger/OpenAPI
=======
- `Backend/` — Spring Boot + MongoDB API, multipart şəkil yükləmə dəstəyi
- `Frontend/` — React + Vite + TypeScript tətbiqi, admin və sayt üzəri görünüşləri
- `docker-compose.yml` — Mongo, backend və frontend üçün konteynerləşdirmə
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977

## Project structure

<<<<<<< HEAD
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
=======
- Backend: Java 21, Spring Boot, Spring Data MongoDB
- Frontend: React, React Router, TypeScript, Vite, Axios
- Containerization: Docker, Docker Compose

## Layihə məqsədi

Bu layihə tələbələrə imkan verir ki, həm frontend, həm də backend hissələrini bir yerdə başa düşsünlər:

1. Backend API yazmaq
2. Frontend üzərində data çəkmək
3. Admin paneldə CRUD əməliyyatlarını reallaşdırmaq
4. Docker ilə hər iki hissəni birgə işə salmaq

## Docker ilə necə işə salmaq olar

Layihənin kök kataloquna gedin:

```bash
cd /c/Users/Namiq/Desktop/fb
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
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

<<<<<<< HEAD
The backend now includes the finalization items from the project report: JWT logout/revocation, corrected RBAC seed role, mounted audit Action/Execution APIs, centralized error handling, CV-to-candidate/application pipeline, candidate Interview/Offer emails with logs, candidate exports, filtered audit exports, scoped/filterable audit dashboard analytics, environment documentation, backend tests and smoke-test tooling.

A true final end-to-end acceptance test still requires a running MongoDB instance plus the deployed frontend/backend environment, because deployment credentials and production infrastructure are environment-specific.
=======
- `Backend/src/main/java/com/inop/backend/controller/ProductController.java` — məhsul API routeları
- `Backend/src/main/java/com/inop/backend/service/impl/ProductServiceImpl.java` — CRUD məntiqi
- `Backend/src/main/java/com/inop/backend/model/Product.java` — məhsul modeli
- `Frontend/src/Context/Context.tsx` — qlobal state və API funksiyaları
- `Frontend/src/Pages/Admin/` — admin səhifələri
- `Frontend/src/Pages/Site/` — istifadəçi-facing səhifələr
- `Frontend/src/Routes/Routes.tsx` — routelər

## Tələbə tapşırığı: Product Management Experience

Bu tapşırıq məhsul səviyyəli bir taskdır. Məqsəd tələbələrin həm frontend, həm də backend-i bir yerdə idarə edə bilmələri və Docker ilə tətbiqi işlədə bilmələri.

### Məhsul məqsədi

`FB Product Showcase` saytı aşağıdakı funksionallığı təmin etməlidir:

- İstifadəçi tərəfi:
  - Məhsul siyahısı
  - Məhsul məlumatlarının görüntülənməsi
  - Məhsul şəkillərinin göstərilməsi
  - Axtarış/filter (optional)

- Admin tərəfi:
  - Mövcud məhsulların siyahısı
  - Yeni məhsul əlavə etmə
  - Məhsul redaktəsi
  - Məhsul silmə

- Backend API:
  - `GET /products`
  - `GET /products/:id`
  - `POST /products`
  - `PUT /products/:id`
  - `DELETE /products/:id`

### Solo şəxs üçün task yönümləri

Əgər tək işləyirsinizsə, aşağıdakı tapşırıqları seçə bilərsiniz:

- Bir səhifənin frontend hissəsini tam yazın və backend API-dən data çəkin
- Məsələn: `Home` səhifəsini düzəldin, məhsulları backend-dən çəkin və göstər
- Və ya `Products` admin səhifəsini düzəldin, siyahını çəkin, silmə funksiyası işləsin

Solo developer üçün ideal iş axını:

1. `git branch feature/<adınız>-<tapşırıq>`
2. Backend API və ya frontend səhifə üçün lazım olan endpoint-ləri tamamlayın
3. Eyni zamanda həmin səhifə üçün data çəkmə və renderlogu yazın
4. Bütün faylları commit edib push edin

### Qrup üçün task yönümləri

Qrupda hər bir üzv aşağıdakı rolları ala bilər:

- Backend modeli / controller yazan
- API routelərini quran
- Frontend səhifə komponentlərini hazırlayan
- UI dizayn və data çəkmə üzərində çalışan

Qrup olaraq fayl paylanması belə ola bilər:

- Üzv A: `GET /products`, `GET /products/:id`, model + controller
- Üzv B: `POST /products`, `PUT /products/:id`, `DELETE /products/:id`
- Üzv C: `Frontend/src/Pages/Site/Home/Home.tsx`, `Frontend/src/Pages/Site/Shop/Shop.tsx`
- Üzv D: `Frontend/src/Pages/Admin/Products/Products.tsx`, `Frontend/src/Pages/Admin/Add/Add.tsx`, `Frontend/src/Pages/Admin/Edit/Edit.tsx`

Hər bir üzv öz səhifəsini və ya API funksiyasını ayrıca tamamlaya bilər.

> Qrup şəklində işləyərkən, hər bir üzv "hər səhifədə data çəkəcək" demək, yəni frontend səhifə komponentləri özəl API sorğularını yazacaq. Backend tərəfdən isə hər routeda müvafiq controller funksiyası mövcud olacaq.

## Tapşırıq tələbləri

### 1) Backend tələbləri

- Məhsul modelində ən azı bu sahələr olsun:
  - `title`
  - `description`
  - `price`
  - `images` (array)
  - `category`
  - `createdAt`
- `multer` ilə şəkil yükləmə funksiyası olsun
- `POST /products` və `PUT /products/:id` endpointləri form-data qəbul etsin
- `GET /products` endpointində axtarış və ya kateqoriya filteri əlavə etmək üstünlükdür
- Hər bir endpoint JSON formatında cavab qaytarsın

### 2) Frontend tələbləri

- Material və ya sadə CSS ilə mobil və masaüstü uyğun interfeys
- `Home` səhifəsi üçün məhsulların görüntülənməsi
- Admin paneldə `Products`, `Add`, `Edit` səhifələri tam işlək olsun
- `Context` istifadə edib API sorğularını mərkəzləşdirin
- `axios` ilə backend-ə sorğular göndərin
- `image` URL-ləri düzgün göstərilsin

### 3) Docker tələbləri

- Repo kökündə `docker-compose.yml` olmalıdır
- Docker Compose ilə aşağıdakıları işə salın:
  - MongoDB
  - Backend
  - Frontend
- `docker compose up --build` əmrini istifadə edin
- `docker compose ps` ilə servis statusunu yoxlayın

## Burada necə yazmaq lazımdır

### Commit və branch trip

- Hər bir tapşırıq üçün yeni branch açın
- Commit-lər qısa və məqsədyönlü olsun:
  - `feat: add product list page`
  - `fix: correct API URL in frontend`
  - `docs: add README deployment instructions`
- Push edərkən branch adı aydın olsun

### Tapşırıq məzmununu README-də necə göstərmək olar

1. Layihənin məqsədi və istifadə olunan texnologiyalar
2. Qısa struktur izahı
3. Docker qurulması və işə salınması
4. Solo və qrup üçün tapşırıq bölməsi
5. Backend və frontend tələbləri
6. Necə push edib göndərmək

## Nümunə iş axını

1. `git clone <repo>`
2. `cd fb`
3. `docker compose up --build`
4. `http://localhost:3000`-a daxil olun
5. Adminə yeni məhsul əlavə edin
6. Dəyişiklikləri commit edib push edin

## Frontend və Backend URL konfiqurasiyası

- Frontend `API_URL` env dəyişəni ilə backend-ə qoşulur
- Docker Compose-da backend servisi `backend:2000` olaraq işləyir
- Host üzərində frontend üçün `localhost:3000`

## Push etmə və təqdimat

- Hər kəs öz branch-i ayrı saxlasın
- Branch adı və commit mesajı aydın olsun
- Demo ekranı qrupa göndərin: frontend `http://localhost:3000`
- Hər kəs öz işi ilə bağlı qısa izahat yazsın

---



## Spring Boot backend

Backend artıq Spring Boot 3.3.4 + Java 21 ilə işləyir. MongoDB bağlantısı və port üçün `CS` və `PORT` environment variable-ları istifadə olunur; şəkillər üçün `UPLOAD_DIR` dəstəklənir.

Backend-i ayrıca işə salmaq üçün `Backend` qovluğunda:

```bash
./gradlew bootRun
```

Windows PowerShell-də environment variable nümunəsi:

```powershell
$env:PORT="2000"
$env:CS="mongodb://localhost:27017/fbdb"
$env:UPLOAD_DIR="uploads"
./gradlew bootRun
```

Docker ilə bütün sistem:

```bash
docker compose up --build
```

Frontend: `http://localhost:3000`  
Backend API: `http://localhost:2001`
>>>>>>> 3e8e70665c032f00c1faf98c380eefa6b2ad9977
