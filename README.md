# INOP — Internal Operations Platform

Full-stack internal operations platform for Recruitment and Internal Audit.

## Features
- JWT authentication and RBAC
- User and role management
- Recruitment and candidate management
- CV upload and processing
- Candidate search, filtering and matching
- Restaurant and audit management
- Audit scoring, comments and attachments
- Analytics dashboards
- Responsive UI

## Stack
- Frontend: React, TypeScript, Vite, React Router, Axios, Context API, i18next, Recharts
- Backend: Node.js, Express, Mongoose, MongoDB, JWT, Multer, Nodemailer
- Documentation: Swagger / OpenAPI
- Infrastructure: Docker / Docker Compose

## Structure
```text
INOP/
├── Backend/
├── Frontend/
├── docker-compose.yml
└── README.md
```

## Setup
### Backend
```bash
cd Backend
npm install
npm run dev
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

Backend: http://localhost:3001

## Production Build
```bash
cd Frontend
npm run build
```

## Docker
```bash
docker compose up --build
```

## API
Base: /api

Swagger: /api-docs

## MVP
**Core + Recruitment + Audit + Dashboard**

## Project Status
MVP implementation is complete. Final work focuses on deployment QA, end-to-end verification and final presentation.

## Author
Vüsal İsgəndərov
