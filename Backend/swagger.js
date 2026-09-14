const swaggerUi = require("swagger-ui-express");

const swaggerSpec = {
  openapi: "3.0.0",

  info: {
    title: "INOP — Internal Operations Platform API",
    version: "1.1.0",
    description:
      "Internal Operations Platform API for authentication, recruitment, audits, analytics, notifications and operational data management.",
  },

  servers: [
    {
      url: "http://localhost:3001/api",
      description: "Local development server",
    },
  ],

  tags: [
    { name: "Authentication" },
    { name: "Users" },
    { name: "Departments" },
    { name: "Activity Logs" },
    { name: "Recruitment" },
    { name: "Audits" },
    { name: "Audit Workflow" },
    { name: "Audit Analytics" },
    { name: "Audit Documents" },
    { name: "Audit Notifications" },
    { name: "Audit Exports" },
    { name: "Recruitment Exports" },
    { name: "Notifications" },
    { name: "Restaurants" },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from POST /auth/login",
      },
    },

    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },

      User: {
        type: "object",
        properties: {
          _id: { type: "string", example: "64f000000000000000000001" },
          name: { type: "string", example: "Aysel Huseynova" },
          email: { type: "string", format: "email", example: "hr@inop.com" },
          role: { type: "string", example: "hr_manager" },
          departmentId: { type: "string", example: "dep_hr" },
          position: { type: "string", example: "HR Manager" },
          managerId: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
        },
      },

      Department: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "Human Resources" },
          description: { type: "string", example: "HR department" },
          isActive: { type: "boolean", example: true },
        },
      },

      Job: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string", example: "Backend Developer" },
          department: { type: "string", example: "dep_it" },
          location: { type: "string", example: "Baku" },
          type: { type: "string", example: "full-time" },
          description: { type: "string" },
          requiredSkills: {
            type: "array",
            items: { type: "string" },
            example: ["Node.js", "MongoDB"],
          },
          preferredSkills: {
            type: "array",
            items: { type: "string" },
            example: ["Docker", "AWS"],
          },
          experienceYears: { type: "number", example: 2 },
          status: { type: "string", example: "open" },
        },
      },

      Candidate: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string", example: "John Smith" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          role: { type: "string", example: "Backend Developer" },
          education: { type: "string" },
          experience: { type: "number", example: 3 },
          skills: {
            type: "array",
            items: { type: "string" },
          },
          languages: {
            type: "array",
            items: { type: "string" },
          },
          certificates: {
            type: "array",
            items: { type: "string" },
          },
          status: { type: "string", example: "new" },
          cvUrl: { type: "string", nullable: true },
        },
      },

      Application: {
        type: "object",
        properties: {
          _id: { type: "string" },
          jobId: { type: "string" },
          candidateId: { type: "string" },
          score: { type: "number", example: 84 },
          status: { type: "string", example: "applied" },
          notes: { type: "string" },
        },
      },

      Audit: {
        type: "object",
        properties: {
          _id: { type: "string" },
          id: { type: "string" },
          restaurantId: { type: "string" },
          auditorId: { type: "string" },
          auditType: { type: "string", example: "standard" },
          status: { type: "string", example: "draft" },
          date: { type: "string", format: "date-time" },
          score: { type: "number" },
          comments: { type: "string" },
        },
      },

      AuditFinding: {
        type: "object",
        properties: {
          _id: { type: "string" },
          auditId: { type: "string" },
          executionId: { type: "string", nullable: true },
          title: { type: "string" },
          description: { type: "string" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
          category: { type: "string" },
          dueDate: { type: "string", format: "date-time", nullable: true },
        },
      },

      AuditNotification: {
        type: "object",
        properties: {
          _id: { type: "string" },
          auditId: { type: "string" },
          userId: { type: "string" },
          type: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
          read: { type: "boolean" },
        },
      },

      Restaurant: {
        type: "object",
        properties: {
          id: { type: "string", example: "rest-001" },
          name: { type: "string", example: "Restaurant A" },
          location: { type: "string", example: "Baku" },
          status: { type: "string", example: "active" },
        },
      },

      AuditTemplate: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          brandId: { type: "string" },
          auditType: { type: "string" },
          status: { type: "string" },
          fields: { type: "array", items: {} },
        },
      },

      AuditApproval: {
        type: "object",
        properties: {
          _id: { type: "string" },
          auditId: { type: "string" },
          findingId: { type: "string", nullable: true },
          actionId: { type: "string", nullable: true },
          requestedBy: { type: "string" },
          reviewer: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
          },
          comment: { type: "string" },
        },
      },

      AuditClosure: {
        type: "object",
        properties: {
          _id: { type: "string" },
          auditId: { type: "string" },
          status: { type: "string" },
          comment: { type: "string" },
        },
      },

      AuditAssignment: {
        type: "object",
        properties: {
          _id: { type: "string" },
          auditId: { type: "string" },
          auditor: { type: "string" },
          assignedBy: { type: "string" },
          status: { type: "string" },
          assignedAt: { type: "string", format: "date-time" },
        },
      },

      ActivityLog: {
        type: "object",
        properties: {
          _id: { type: "string" },
          action: { type: "string" },
          resource: { type: "string" },
          resourceId: { type: "string" },
          userId: { type: "string" },
          details: { type: "object" },
        },
      },
    },
  },

  security: [{ bearerAuth: [] }],

  paths: {
    /* =========================
       AUTHENTICATION
       ========================= */

    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Successful login",
          },
          400: { description: "Invalid request" },
          401: { description: "Invalid credentials" },
          403: { description: "Inactive account" },
        },
      },
    },

    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get authenticated user",
        responses: {
          200: { description: "Authenticated user" },
          401: { description: "Authentication required" },
        },
      },
    },

    /* =========================
       USERS
       ========================= */

    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        responses: {
          200: { description: "User list" },
          401: { description: "Authentication required" },
          403: { description: "Insufficient permissions" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "role"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password", minLength: 6 },
                  role: { type: "string" },
                  departmentId: { type: "string" },
                  position: { type: "string" },
                  managerId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User created" },
          400: { description: "Validation error" },
          409: { description: "Duplicate user" },
        },
      },
    },

    "/users/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Users"],
        summary: "Get user",
        responses: {
          200: { description: "User" },
          400: { description: "Invalid ID" },
          404: { description: "User not found" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string" },
                  departmentId: { type: "string" },
                  position: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User updated" },
          400: { description: "Validation error" },
          404: { description: "User not found" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user",
        responses: {
          200: { description: "User deleted" },
          404: { description: "User not found" },
        },
      },
    },

    "/users/{id}/status": {
      patch: {
        tags: ["Users"],
        summary: "Activate or deactivate user",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["isActive"],
                properties: {
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "User status updated" },
          400: { description: "Invalid request" },
          404: { description: "User not found" },
        },
      },
    },

    /* =========================
       DEPARTMENTS
       ========================= */

    "/departments": {
      get: {
        tags: ["Departments"],
        summary: "List departments",
        responses: {
          200: { description: "Department list" },
        },
      },
      post: {
        tags: ["Departments"],
        summary: "Create department",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Department created" },
          400: { description: "Validation error" },
          409: { description: "Duplicate department" },
        },
      },
    },

    "/departments/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Departments"],
        summary: "Get department",
        responses: {
          200: { description: "Department" },
          404: { description: "Department not found" },
        },
      },
      put: {
        tags: ["Departments"],
        summary: "Update department",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Department updated" },
          404: { description: "Department not found" },
        },
      },
      delete: {
        tags: ["Departments"],
        summary: "Delete department",
        responses: {
          200: { description: "Department deleted" },
          404: { description: "Department not found" },
        },
      },
    },

    /* =========================
       ACTIVITY LOGS
       ========================= */

    "/activity-logs": {
      get: {
        tags: ["Activity Logs"],
        summary: "List activity logs",
        responses: {
          200: { description: "Activity log list" },
        },
      },
      post: {
        tags: ["Activity Logs"],
        summary: "Create activity log",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActivityLog" },
            },
          },
        },
        responses: {
          201: { description: "Activity log created" },
        },
      },
    },

    /* =========================
       RECRUITMENT — JOBS
       ========================= */

    "/jobs": {
      get: {
        tags: ["Recruitment"],
        summary: "List jobs",
        responses: {
          200: { description: "Job list" },
        },
      },
      post: {
        tags: ["Recruitment"],
        summary: "Create job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Job" },
            },
          },
        },
        responses: {
          201: { description: "Job created" },
          400: { description: "Validation error" },
        },
      },
    },

    "/jobs/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Recruitment"],
        summary: "Get job",
        responses: {
          200: { description: "Job" },
          400: { description: "Invalid ID" },
          404: { description: "Job not found" },
        },
      },
      put: {
        tags: ["Recruitment"],
        summary: "Update job",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Job" },
            },
          },
        },
        responses: {
          200: { description: "Job updated" },
          400: { description: "Validation error" },
          404: { description: "Job not found" },
        },
      },
      delete: {
        tags: ["Recruitment"],
        summary: "Delete job",
        responses: {
          200: { description: "Job deleted" },
          404: { description: "Job not found" },
        },
      },
    },

    /* =========================
       CANDIDATES
       ========================= */

    "/candidates": {
      get: {
        tags: ["Recruitment"],
        summary: "List candidates",
        responses: {
          200: { description: "Candidate list" },
        },
      },
      post: {
        tags: ["Recruitment"],
        summary: "Create candidate",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "role"],
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  education: { type: "string" },
                  experience: { type: "number" },
                  skills: {
                    type: "array",
                    items: { type: "string" },
                  },
                  languages: {
                    type: "array",
                    items: { type: "string" },
                  },
                  certificates: {
                    type: "array",
                    items: { type: "string" },
                  },
                  status: { type: "string" },
                  cv: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Candidate created" },
          400: { description: "Validation error" },
        },
      },
    },

    "/candidates/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Recruitment"],
        summary: "Get candidate",
        responses: {
          200: { description: "Candidate" },
          400: { description: "Invalid ID" },
          404: { description: "Candidate not found" },
        },
      },
      put: {
        tags: ["Recruitment"],
        summary: "Update candidate",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Candidate" },
            },
          },
        },
        responses: {
          200: { description: "Candidate updated" },
          400: { description: "Validation error" },
          404: { description: "Candidate not found" },
        },
      },
      delete: {
        tags: ["Recruitment"],
        summary: "Delete candidate",
        responses: {
          200: { description: "Candidate deleted" },
          404: { description: "Candidate not found" },
        },
      },
    },

    "/candidates/{id}/status": {
      patch: {
        tags: ["Recruitment"],
        summary: "Update candidate status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Candidate status updated" },
          400: { description: "Invalid status" },
          404: { description: "Candidate not found" },
        },
      },
    },

    "/candidates/parse-cv": {
      post: {
        tags: ["Recruitment"],
        summary: "Parse CV and extract structured candidate data",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["cv"],
                properties: {
                  cv: {
                    type: "string",
                    format: "binary",
                    description: "PDF or DOCX CV file",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Parsed CV data" },
          400: { description: "CV file required" },
          422: { description: "CV could not be parsed" },
        },
      },
    },

    /* =========================
       APPLICATIONS
       ========================= */

    "/applications": {
      get: {
        tags: ["Recruitment"],
        summary: "List applications",
        responses: {
          200: { description: "Application list" },
        },
      },
      post: {
        tags: ["Recruitment"],
        summary: "Create application",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["jobId", "candidateId"],
                properties: {
                  jobId: { type: "string" },
                  candidateId: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Application created" },
          400: { description: "Validation error" },
          409: { description: "Duplicate application" },
        },
      },
    },

    "/applications/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Recruitment"],
        summary: "Get application",
        responses: {
          200: { description: "Application" },
          404: { description: "Application not found" },
        },
      },
      delete: {
        tags: ["Recruitment"],
        summary: "Delete application",
        responses: {
          200: { description: "Application deleted" },
          404: { description: "Application not found" },
        },
      },
    },

    "/applications/{id}/status": {
      patch: {
        tags: ["Recruitment"],
        summary: "Update application status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Application status updated" },
          400: { description: "Invalid status" },
          404: { description: "Application not found" },
        },
      },
    },

    /* =========================
       CORE AUDITS
       ========================= */

    "/audits": {
      get: {
        tags: ["Audits"],
        summary: "List audits",
        responses: {
          200: { description: "Audit list" },
        },
      },
      post: {
        tags: ["Audits"],
        summary: "Create audit",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Audit" },
            },
          },
        },
        responses: {
          201: { description: "Audit created" },
          400: { description: "Validation error" },
          409: { description: "Conflicting audit" },
        },
      },
    },

    "/audits/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Audits"],
        summary: "Get audit",
        responses: {
          200: { description: "Audit" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
      put: {
        tags: ["Audits"],
        summary: "Update audit",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Audit" },
            },
          },
        },
        responses: {
          200: { description: "Audit updated" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
      delete: {
        tags: ["Audits"],
        summary: "Delete audit",
        responses: {
          200: { description: "Audit deleted" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audits/analytics": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Get aggregate audit analytics",
        responses: {
          200: { description: "Audit analytics" },
          403: { description: "Access denied" },
        },
      },
    },

    /* =========================
       AUDIT MODULE
       ========================= */

    "/audit-module/standard": {
      get: {
        tags: ["Audits"],
        summary: "List standard audits",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "restaurantId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string" } },
          { name: "to", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Standard audits" },
        },
      },
    },

    "/audit-module/service": {
      get: {
        tags: ["Audits"],
        summary: "List service audits",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "restaurantId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string" } },
          { name: "to", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Service audits" },
        },
      },
    },

    /* =========================
       OCCUPATIONAL SAFETY
       ========================= */

    "/occupational-safety-audits": {
      get: {
        tags: ["Audits"],
        summary: "List occupational safety audits",
        responses: {
          200: { description: "Safety audit list" },
        },
      },
      post: {
        tags: ["Audits"],
        summary: "Create occupational safety audit",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  restaurantId: { type: "string" },
                  date: { type: "string" },
                  shift: { type: "string" },
                  status: { type: "string" },
                  template: { type: "object" },
                  scores: { type: "object" },
                  checks: { type: "array", items: {} },
                  serviceTimeObservations: { type: "array", items: {} },
                  findings: { type: "array", items: {} },
                  recommendations: { type: "array", items: {} },
                  overallPercentage: { type: "number" },
                  comments: { type: "string" },
                  photos: { type: "array", items: { type: "string" } },
                  attachments: { type: "array", items: { type: "string" } },
                  metadata: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Safety audit created" },
          409: { description: "Duplicate audit" },
        },
      },
    },

    "/occupational-safety-details/{id}/details": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Audits"],
        summary: "Get occupational safety details",
        responses: {
          200: { description: "Safety details" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
      patch: {
        tags: ["Audits"],
        summary: "Update occupational safety details",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  riskLevel: { type: "string" },
                  violations: { type: "array", items: {} },
                  correctiveAction: { type: "string" },
                  responsiblePerson: { type: "string" },
                  deadline: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Safety details updated" },
          404: { description: "Audit not found" },
        },
      },
    },

    /* =========================
       AUDIT WORKFLOW
       ========================= */

    "/audit-workflow/{id}/status": {
      patch: {
        tags: ["Audit Workflow"],
        summary: "Update audit lifecycle status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Audit status updated" },
          400: { description: "Invalid status" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-findings/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "List findings for audit",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Finding list" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-findings": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Create audit finding",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["auditId", "title"],
                properties: {
                  auditId: { type: "string" },
                  executionId: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" },
                  category: { type: "string" },
                  dueDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Finding created" },
          400: { description: "Validation error" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-assignments": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Assign audit to auditor",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AuditAssignment",
              },
            },
          },
        },
        responses: {
          201: { description: "Audit assigned" },
          403: { description: "Access denied" },
        },
      },
    },

    "/audit-assignments/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "Get audit assignments",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Assignment list" },
        },
      },
    },

    "/audit-approval": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Request audit approval",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuditApproval" },
            },
          },
        },
        responses: {
          201: { description: "Approval requested" },
          400: { description: "Validation error" },
          403: { description: "Access denied" },
        },
      },
    },

    "/audit-approval/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "List audit approvals",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Approval list" },
        },
      },
    },

    "/audit-approval/{id}": {
      patch: {
        tags: ["Audit Workflow"],
        summary: "Update approval status",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Approval updated" },
          400: { description: "Invalid approval" },
          404: { description: "Approval not found" },
        },
      },
    },

    "/audit-closure": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Close audit",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  auditId: { type: "string" },
                  comment: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Audit closed" },
          400: { description: "Validation error" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-closure/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "Get audit closure",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Closure information" },
          404: { description: "Closure not found" },
        },
      },
    },

    "/audit-timeline/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "Get audit timeline",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Audit timeline" },
        },
      },
    },

    "/audit-activity": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Create audit activity",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
        responses: {
          201: { description: "Activity created" },
        },
      },
    },

    "/audit-activity/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "Get audit activities",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Audit activities" },
        },
      },
    },

    "/audit-activity/{auditId}/timeline": {
      get: {
        tags: ["Audit Workflow"],
        summary: "Get audit activity timeline",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Activity timeline" },
        },
      },
    },

    /* =========================
       AUDIT ANALYTICS
       ========================= */

    "/audit-analytics/summary": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Audit summary analytics",
        responses: {
          200: { description: "Summary analytics" },
        },
      },
    },

    "/audit-analytics/type": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Audit analytics by type",
        responses: {
          200: { description: "Type analytics" },
        },
      },
    },

    "/audit-analytics/trend": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Audit trend analytics",
        responses: {
          200: { description: "Trend analytics" },
        },
      },
    },

    "/audit-analytics/service": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Service audit analytics",
        responses: {
          200: { description: "Service analytics" },
        },
      },
    },

    "/audit-analytics/standard": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Standard audit analytics",
        responses: {
          200: { description: "Standard analytics" },
        },
      },
    },

    "/audit-analytics/safety": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Occupational safety analytics",
        responses: {
          200: { description: "Safety analytics" },
        },
      },
    },

    "/audit-dashboard": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Get filterable audit dashboard",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "auditType", in: "query", schema: { type: "string" } },
          { name: "auditorId", in: "query", schema: { type: "string" } },
          { name: "restaurantId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          200: { description: "Dashboard data" },
          403: { description: "Access denied" },
        },
      },
    },

    "/audit-report/{id}": {
      get: {
        tags: ["Audit Analytics"],
        summary: "Get audit report",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Audit report" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-score/{id}/calculate": {
      post: {
        tags: ["Audit Analytics"],
        summary: "Calculate audit score",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Calculated audit score" },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-permission/check": {
      get: {
        tags: ["Audits"],
        summary: "Check audit access",
        responses: {
          200: { description: "Audit access result" },
        },
      },
    },

    /* =========================
       NOTIFICATIONS
       ========================= */

    "/audit-notification": {
      get: {
        tags: ["Audit Notifications"],
        summary: "List audit notifications",
        responses: {
          200: { description: "Notification list" },
        },
      },
      post: {
        tags: ["Audit Notifications"],
        summary: "Create audit notification",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AuditNotification",
              },
            },
          },
        },
        responses: {
          201: { description: "Notification created" },
          400: { description: "Validation error" },
          404: { description: "Recipient not found" },
        },
      },
    },

    "/audit-notification/{id}/read": {
      patch: {
        tags: ["Audit Notifications"],
        summary: "Mark notification as read",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Notification marked as read" },
          404: { description: "Notification not found" },
        },
      },
    },

    /* =========================
       EXPORTS
       ========================= */

    "/audit-export/{auditId}/csv": {
      get: {
        tags: ["Audit Exports"],
        summary: "Export audit as CSV",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "CSV export",
            content: {
              "text/csv": {
                schema: { type: "string" },
              },
            },
          },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-export/{auditId}/excel": {
      get: {
        tags: ["Audit Exports"],
        summary: "Export audit as Excel",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Excel XLSX export",
            content: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    "/audit-export/{auditId}/pdf": {
      get: {
        tags: ["Audit Exports"],
        summary: "Export audit as PDF",
        parameters: [
          {
            name: "auditId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "PDF export",
            content: {
              "application/pdf": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          403: { description: "Access denied" },
          404: { description: "Audit not found" },
        },
      },
    },

    /* =========================
       AUDIT SOURCE DOCUMENTS
       ========================= */

    "/audit-source-documents": {
      get: {
        tags: ["Audit Documents"],
        summary: "List audit source documents",
        parameters: [
          { name: "templateId", in: "query", schema: { type: "string" } },
          { name: "brandId", in: "query", schema: { type: "string" } },
          { name: "auditType", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Document list" },
        },
      },
      post: {
        tags: ["Audit Documents"],
        summary: "Upload audit source document",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                  },
                  templateId: { type: "string" },
                  brandId: { type: "string" },
                  auditType: { type: "string" },
                  uploadedBy: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Document uploaded" },
          400: { description: "File required" },
        },
      },
    },

    "/audit-source-documents/{id}": {
      delete: {
        tags: ["Audit Documents"],
        summary: "Delete source document",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Document deleted" },
          404: { description: "Document not found" },
        },
      },
    },

    /* =========================
       AUDIT TEMPLATES
       ========================= */

    "/audit-templates": {
      get: {
        tags: ["Audits"],
        summary: "List audit templates",
        parameters: [
          { name: "brandId", in: "query", schema: { type: "string" } },
          { name: "auditType", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Template list" },
        },
      },
      post: {
        tags: ["Audits"],
        summary: "Create audit template",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuditTemplate" },
            },
          },
        },
        responses: {
          201: { description: "Template created" },
          400: { description: "Validation error" },
        },
      },
    },

    "/audit-templates/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Audits"],
        summary: "Get audit template",
        responses: {
          200: { description: "Template" },
          400: { description: "Invalid ID" },
          404: { description: "Template not found" },
        },
      },
      put: {
        tags: ["Audits"],
        summary: "Update audit template",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuditTemplate" },
            },
          },
        },
        responses: {
          200: { description: "Template updated" },
          404: { description: "Template not found" },
        },
      },
      delete: {
        tags: ["Audits"],
        summary: "Delete audit template",
        responses: {
          200: { description: "Template deleted" },
          404: { description: "Template not found" },
        },
      },
    },

    /* =========================
       RESTAURANTS
       ========================= */

    "/restaurants": {
      get: {
        tags: ["Restaurants"],
        summary: "List restaurants",
        responses: {
          200: { description: "Restaurant list" },
        },
      },
      post: {
        tags: ["Restaurants"],
        summary: "Create restaurant",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "location"],
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  location: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Restaurant created" },
        },
      },
    },

    "/restaurants/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        tags: ["Restaurants"],
        summary: "Get restaurant",
        responses: {
          200: { description: "Restaurant" },
          404: { description: "Restaurant not found" },
        },
      },
      put: {
        tags: ["Restaurants"],
        summary: "Update restaurant",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Restaurant" },
            },
          },
        },
        responses: {
          200: { description: "Restaurant updated" },
          404: { description: "Restaurant not found" },
        },
      },
      delete: {
        tags: ["Restaurants"],
        summary: "Delete restaurant",
        responses: {
          200: { description: "Restaurant deleted" },
          404: { description: "Restaurant not found" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout and revoke the current JWT",
        responses: {
          200: { description: "Token revoked" },
          401: { description: "Authentication required" },
        },
      },
    },

    "/candidates/from-cv": {
      post: {
        tags: ["Recruitment"],
        summary: "Create candidate from CV and optionally create a matched application",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["cv"],
                properties: {
                  cv: { type: "string", format: "binary" },
                  jobId: { type: "string" },
                  name: { type: "string" },
                  role: { type: "string" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  education: { type: "string" },
                  experience: { type: "number" },
                  skills: { type: "string", description: "JSON array or comma-separated list" },
                  languages: { type: "string", description: "JSON array or comma-separated list" },
                  certificates: { type: "string", description: "JSON array or comma-separated list" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Candidate and optional application created" },
          400: { description: "Invalid input" },
          422: { description: "CV could not provide required candidate fields" },
        },
      },
    },

    "/candidate-export/csv": {
      get: {
        tags: ["Recruitment Exports"],
        summary: "Export filtered candidates as CSV",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Candidate CSV" } },
      },
    },

    "/candidate-export/excel": {
      get: {
        tags: ["Recruitment Exports"],
        summary: "Export filtered candidates as Excel",
        responses: { 200: { description: "Candidate XLSX" } },
      },
    },

    "/candidate-export/{candidateId}/pdf": {
      get: {
        tags: ["Recruitment Exports"],
        summary: "Export one candidate report as PDF",
        parameters: [
          {
            name: "candidateId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Candidate PDF" },
          404: { description: "Candidate not found" },
        },
      },
    },

    "/notification-logs": {
      get: {
        tags: ["Notifications"],
        summary: "List candidate email delivery logs",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["sent", "skipped", "failed"] } },
          { name: "type", in: "query", schema: { type: "string" } },
          { name: "recipient", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Notification log page" } },
      },
    },

    "/audit-actions": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Create corrective audit action",
        responses: { 201: { description: "Action created" } },
      },
    },

    "/audit-actions/audit/{auditId}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "List actions for an audit",
        parameters: [
          { name: "auditId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Audit actions" } },
      },
    },

    "/audit-actions/{id}/status": {
      put: {
        tags: ["Audit Workflow"],
        summary: "Update corrective action status",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Action updated" } },
      },
    },

    "/audit-executions": {
      post: {
        tags: ["Audit Workflow"],
        summary: "Create audit execution",
        responses: { 201: { description: "Execution created" } },
      },
    },

    "/audit-executions/{id}": {
      get: {
        tags: ["Audit Workflow"],
        summary: "Get audit execution",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Execution" } },
      },
    },

    "/audit-executions/{id}/submit": {
      put: {
        tags: ["Audit Workflow"],
        summary: "Submit audit execution and calculate risk",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Execution submitted" } },
      },
    },

    "/audit-export/list/csv": {
      get: {
        tags: ["Audit Exports"],
        summary: "Export filtered audit list as CSV",
        responses: { 200: { description: "Filtered audit CSV" } },
      },
    },

    "/audit-export/list/excel": {
      get: {
        tags: ["Audit Exports"],
        summary: "Export filtered audit list as Excel",
        responses: { 200: { description: "Filtered audit XLSX" } },
      },
    },

  },
};

function setupSwagger(app) {
  app.get("/api-docs/swagger.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  app.get("/api-docs/openapi.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "INOP API Documentation",
    })
  );
}

module.exports = setupSwagger;
module.exports.swaggerSpec = swaggerSpec;
