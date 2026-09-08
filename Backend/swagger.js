const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'INOP Recruitment API',
      version: '1.0.0',
      description: 'INOP Recruitment & Operations Module API Documentation',
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Local Server',
      },
    ],
    components: {
      schemas: {
        Job: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '66c123456789abcdef123456' },
            title: { type: 'string', example: 'Frontend Developer' },
            department: { type: 'string', example: 'Engineering' },
            description: { type: 'string', example: 'React & TypeScript developer' },
          },
        },
        Candidate: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '66c123456789abcdef654321' },
            name: { type: 'string', example: 'Əli Məmmədov' },
            email: { type: 'string', example: 'ali@example.com' },
            cvUrl: { type: 'string', example: '/uploads/cv.pdf' },
          },
        },
        Application: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '66c123456789abcdef999999' },
            jobId: { type: 'string', example: '66c123456789abcdef123456' },
            candidateId: { type: 'string', example: '66c123456789abcdef654321' },
            status: { type: 'string', example: 'Applied' },
          },
        },
      },
    },
    paths: {
      '/jobs': {
        get: { summary: 'Bütün vakansiyaları gətir', responses: { 200: { description: 'Uğurlu' } } },
        post: { summary: 'Yeni vakansiya yarat', responses: { 201: { description: 'Yaradıldı' } } },
      },
      '/candidates': {
        get: { summary: 'Bütün namizədləri gətir', responses: { 200: { description: 'Uğurlu' } } },
        post: { summary: 'Yeni namizəd əlavə et', responses: { 201: { description: 'Yaradıldı' } } },
      },
      '/applications': {
        get: { summary: 'Bütün müraciətləri gətir', responses: { 200: { description: 'Uğurlu' } } },
        post: { summary: 'Yeni müraciət yarat', responses: { 201: { description: 'Yaradıldı' } } },
      },
    },
  },
  apis: [], // Otomatik skanı söndürmək üçün boş saxlayırıq
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwagger;