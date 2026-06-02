import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hintro Meeting Intelligence API',
      version: '1.0.0',
      description: 'Production-ready REST API for meeting intelligence with AI-powered analysis',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'https://hintro-meeting-intelligence.up.railway.app',
        description: 'Production server',
      },
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: your-token-here',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            traceId: { type: 'string' },
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    security: [],
  },
  apis: ['./src/modules/**/*.routes.ts', './dist/modules/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
