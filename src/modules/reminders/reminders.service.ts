import { PrismaClient, ActionItem, Meeting, User } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../../config/env';
import logger from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const resend = new Resend(env.RESEND_API_KEY);

type ActionItemWithMeetingAndUser = ActionItem & {
  meeting: Meeting & {
    user: User;
  };
};

export class RemindersService {
  async sendOverdueReminder(actionItem: ActionItemWithMeetingAndUser): Promise<void> {
    const traceId = uuidv4();

    logger.warn('Assignee email not resolvable, falling back to meeting owner email', {
      traceId,
      assignee: actionItem.assignee,
      actionItemId: actionItem.id,
    });

    const recipientEmail = actionItem.meeting.user.email;
    const dueDateFormatted = actionItem.dueDate
      ? new Date(actionItem.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'No due date';

    const emailBody = `
Hello,

This is a reminder about an overdue action item from your meeting.

Meeting: ${actionItem.meeting.title}
Task: ${actionItem.task}
Assignee: ${actionItem.assignee}
Due Date: ${dueDateFormatted}
Status: ${actionItem.status}

Please review and update the status as needed.

Best regards,
Hintro Meeting Intelligence
    `.trim();

    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: recipientEmail,
        subject: `Reminder: Overdue Action Item — ${actionItem.task}`,
        text: emailBody,
      });

      await prisma.reminderLog.create({
        data: {
          actionItemId: actionItem.id,
          sentTo: recipientEmail,
          sentAt: new Date(),
          channel: 'EMAIL',
          success: true,
          errorMessage: null,
        },
      });

      logger.info('Overdue reminder sent successfully', {
        traceId,
        actionItemId: actionItem.id,
        sentTo: recipientEmail,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;

      await prisma.reminderLog.create({
        data: {
          actionItemId: actionItem.id,
          sentTo: recipientEmail,
          sentAt: new Date(),
          channel: 'EMAIL',
          success: false,
          errorMessage,
        },
      });

      logger.error('Failed to send overdue reminder', {
        traceId,
        actionItemId: actionItem.id,
        sentTo: recipientEmail,
        error: errorMessage,
      });
    }
  }
}

export const remindersService = new RemindersService();
