import { PrismaClient, ActionItem, ActionItemStatus } from '@prisma/client';
import { CreateActionItemInput, UpdateStatusInput, GetActionItemsQuery } from './actionItems.schema';
import redis from '../../config/redis';
import logger from '../../config/logger';

const prisma = new PrismaClient();

export class ActionItemsService {
  async createActionItem(userId: string, input: CreateActionItemInput): Promise<ActionItem> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: input.meetingId },
    });

    if (!meeting) {
      throw new Error('NOT_FOUND');
    }

    if (meeting.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    const actionItem = await prisma.actionItem.create({
      data: {
        task: input.task,
        assignee: input.assignee,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        meetingId: input.meetingId,
        citations: input.citations,
      },
    });

    try {
      const cachePattern = `action-items:${userId}:*`;
      const keys = await redis.keys(cachePattern);
      if (keys && Array.isArray(keys) && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Failed to invalidate action items cache', { error: (error as Error).message });
    }

    return actionItem;
  }

  async getActionItems(userId: string, filters: GetActionItemsQuery): Promise<ActionItem[]> {
    const cacheKey = `action-items:${userId}:${filters.status || 'all'}:${filters.assignee || 'all'}:${filters.meetingId || 'all'}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for action items', { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to read from cache', { error: (error as Error).message });
    }

    const where = {
      meeting: {
        userId,
      },
      ...(filters.status && { status: filters.status }),
      ...(filters.assignee && { assignee: filters.assignee }),
      ...(filters.meetingId && { meetingId: filters.meetingId }),
    };

    const actionItems = await prisma.actionItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    try {
      await redis.setex(cacheKey, 60, JSON.stringify(actionItems));
    } catch (error) {
      logger.warn('Failed to write to cache', { error: (error as Error).message });
    }

    return actionItems;
  }

  async getOverdueActionItems(userId: string): Promise<Array<ActionItem & { meeting: { title: string } }>> {
    const now = new Date();

    const actionItems = await prisma.actionItem.findMany({
      where: {
        meeting: {
          userId,
        },
        status: {
          not: ActionItemStatus.COMPLETED,
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        meeting: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return actionItems;
  }

  async updateActionItemStatus(
    actionItemId: string,
    userId: string,
    input: UpdateStatusInput
  ): Promise<ActionItem> {
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      include: {
        meeting: true,
      },
    });

    if (!actionItem) {
      throw new Error('NOT_FOUND');
    }

    if (actionItem.meeting.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    if (actionItem.status === ActionItemStatus.COMPLETED) {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    const updated = await prisma.actionItem.update({
      where: { id: actionItemId },
      data: { status: input.status },
    });

    try {
      const cachePattern = `action-items:${userId}:*`;
      const keys = await redis.keys(cachePattern);
      if (keys && Array.isArray(keys) && keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Failed to invalidate action items cache', { error: (error as Error).message });
    }

    return updated;
  }
}

export const actionItemsService = new ActionItemsService();

