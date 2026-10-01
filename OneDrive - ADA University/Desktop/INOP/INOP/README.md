# INOP — Internal Operations Platform

INOP is a full-stack internal operations platform covering **Recruitment / ATS** and **Internal Audit** workflows.

## Features

### Authentication & Security
- JWT authentication
- Token expiry and revocation
- Login, current-user and logout flows
- Role-based access control (RBAC)
- Protected frontend routes
- Backend authorization middleware
- Rate limiting and security headers

### Recruitment / ATS
- Candidate management
- Job and application management
- Candidate search and filtering
- CV upload and processing
- PDF and DOCX text extraction
- Structured candidate data processing
- Candidate matching and AI match score
- Candidate status management
- Candidate status email notifications
- Candidate PDF export
- Candidate Excel export

### Internal Audit
- Audit management
- Audit assignments and workflows
- Audit execution
- Findings, actions and approvals
- Audit scoring
- Audit reports
- Audit analytics and dashboards
- Attachments and activity tracking
- Occupational safety audit workflows

### Frontend
- Responsive desktop, tablet and mobile UI
- React + TypeScript
- React Router
- Context API authentication
- i18next localization
- Recharts analytics
- Loading, empty and error states
- Toast notifications
- Route-level lazy loading and code splitting

### API & Documentation
- REST API
- Standardized API error responses
- MongoDB validation and error handling
- Swagger / OpenAPI documentation
- Swagger UI

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Axios
- Context API
- i18next / react-i18next
- Recharts
- Formik
- Lucide React
- React Hot Toast

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Multer
- pdf-parse
- Mammoth
- Nodemailer
- PDFKit
- XLSX

### Infrastructure
- Docker
- Docker Compose
- MongoDB 7
- Nginx

### API Documentation
- Swagger / OpenAPI
- swagger-jsdoc
- swagger-ui-express

## Project Structure

```text
INOP/
├── Backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── scripts/
│   ├── uploads/
│   ├── server.js
│   └── swagger.js
├── Frontend/
│   ├── public/
│   └── src/
├── docker-compose.yml
└── README.md