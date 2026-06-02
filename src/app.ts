import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { traceIdMiddleware } from './middleware/traceId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter';
import authRoutes from './modules/auth/auth.routes';
import meetingsRoutes from './modules/meetings/meetings.routes';
import actionItemsRoutes from './modules/actionItems/actionItems.routes';
import { sendSuccess } from './utils/response';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use(traceIdMiddleware);
app.use(requestLoggerMiddleware);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'UP' });
});

/**
 * @swagger
 * /api/evaluation:
 *   get:
 *     summary: Evaluation metadata endpoint
 *     tags: [Evaluation]
 *     responses:
 *       200:
 *         description: Project evaluation information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 candidateName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 repositoryUrl:
 *                   type: string
 *                 deployedUrl:
 *                   type: string
 *                 externalIntegration:
 *                   type: string
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get('/api/evaluation', (req: Request, res: Response) => {
  sendSuccess(
    res,
    {
      candidateName: 'Teja',
      email: 'uvteja1111@gmail.com',
      repositoryUrl: 'https://github.com/uvenkatateja/hintro-meeting-intelligence',
      deployedUrl: 'https://your-railway-url.up.railway.app',
      externalIntegration: 'Resend Email API',
      features: [
        'JWT Authentication',
        'Meeting Management with Pagination',
        'AI Meeting Analysis with Citations',
        'Hallucination Prevention via Grounded Prompting',
        'Action Item Management',
        'Overdue Detection',
        'Scheduled Reminder Job',
        'Resend Email Integration',
        'ReminderLog History',
        'Request Trace IDs',
        'Structured Winston Logging',
        'Global Error Handling',
        'Zod Validation',
        'Swagger API Documentation',
        'Redis Caching',
        'Rate Limiting',
        'Docker Support',
        'CI/CD Pipeline',
        'Integration Tests',
      ],
    },
    200,
    req.traceId
  );
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/meetings', apiRateLimiter, meetingsRoutes);
app.use('/api/action-items', apiRateLimiter, actionItemsRoutes);

app.use(errorHandler);

export default app;
