import { PrismaClient } from '@prisma/client';
import app from './app';
import { env } from './config/env';
import logger from './config/logger';
import { startOverdueReminderJob } from './scheduler/overdueReminder.job';

const prisma = new PrismaClient();

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    startOverdueReminderJob();

    const port = parseInt(env.PORT);
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Swagger documentation available at http://localhost:${port}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

startServer();

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
