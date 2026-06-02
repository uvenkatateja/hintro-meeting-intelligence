import cron from 'node-cron';
import { PrismaClient, ActionItemStatus } from '@prisma/client';
import { env } from '../config/env';
import { remindersService } from '../modules/reminders/reminders.service';
import logger from '../config/logger';

const prisma = new PrismaClient();

export function startOverdueReminderJob(): void {
  const schedule = env.REMINDER_CRON;

  logger.info('Starting overdue reminder job', { schedule });

  cron.schedule(schedule, async () => {
    const jobStartTime = new Date();
    logger.info('Overdue reminder job started', { timestamp: jobStartTime });

    try {
      const now = new Date();

      const overdueActionItems = await prisma.actionItem.findMany({
        where: {
          status: {
            not: ActionItemStatus.COMPLETED,
          },
          dueDate: {
            lt: now,
          },
        },
        include: {
          meeting: {
            include: {
              user: true,
            },
          },
          reminderLogs: {
            where: {
              success: true,
            },
            orderBy: {
              sentAt: 'desc',
            },
            take: 1,
          },
        },
      });

      logger.info('Found overdue action items', { total: overdueActionItems.length });

      let skippedCount = 0;
      let sentCount = 0;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const actionItem of overdueActionItems) {
        const lastSuccessfulReminder = actionItem.reminderLogs[0];

        if (lastSuccessfulReminder && lastSuccessfulReminder.sentAt > twentyFourHoursAgo) {
          skippedCount++;
          logger.debug('Skipping action item - reminder already sent within 24 hours', {
            actionItemId: actionItem.id,
            lastSent: lastSuccessfulReminder.sentAt,
          });
          continue;
        }

        await remindersService.sendOverdueReminder(actionItem);
        sentCount++;
      }

      const jobEndTime = new Date();
      logger.info('Overdue reminder job completed', {
        totalOverdue: overdueActionItems.length,
        skipped: skippedCount,
        sent: sentCount,
        duration: `${jobEndTime.getTime() - jobStartTime.getTime()}ms`,
      });
    } catch (error) {
      logger.error('Overdue reminder job failed', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  });
}
