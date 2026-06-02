import { ActionItemsService } from '../../modules/actionItems/actionItems.service';
import { ActionItemStatus } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    meeting: {
      findUnique: jest.fn(),
    },
    actionItem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    ActionItemStatus: {
      PENDING: 'PENDING',
      IN_PROGRESS: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
    },
  };
});

jest.mock('../../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    setex: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  },
}));

const { PrismaClient } = require('@prisma/client');
const mockPrisma = new PrismaClient();

describe('ActionItemsService', () => {
  let actionItemsService: ActionItemsService;

  beforeEach(() => {
    actionItemsService = new ActionItemsService();
    jest.clearAllMocks();
  });

  describe('updateActionItemStatus', () => {
    it('should successfully update status from PENDING to IN_PROGRESS', async () => {
      const actionItemId = 'action123';
      const userId = 'user123';
      const input = { status: ActionItemStatus.IN_PROGRESS };

      const mockActionItem = {
        id: actionItemId,
        task: 'Test task',
        status: ActionItemStatus.PENDING,
        meeting: {
          userId,
        },
      };

      const mockUpdated = {
        ...mockActionItem,
        status: ActionItemStatus.IN_PROGRESS,
      };

      mockPrisma.actionItem.findUnique.mockResolvedValue(mockActionItem);
      mockPrisma.actionItem.update.mockResolvedValue(mockUpdated);

      const result = await actionItemsService.updateActionItemStatus(actionItemId, userId, input);

      expect(result.status).toBe(ActionItemStatus.IN_PROGRESS);
    });

    it('should throw error when trying to reopen completed item', async () => {
      const actionItemId = 'action123';
      const userId = 'user123';
      const input = { status: ActionItemStatus.PENDING };

      const mockActionItem = {
        id: actionItemId,
        task: 'Test task',
        status: ActionItemStatus.COMPLETED,
        meeting: {
          userId,
        },
      };

      mockPrisma.actionItem.findUnique.mockResolvedValue(mockActionItem);

      await expect(
        actionItemsService.updateActionItemStatus(actionItemId, userId, input)
      ).rejects.toThrow('INVALID_STATUS_TRANSITION');
    });
  });

  describe('getOverdueActionItems', () => {
    it('should return only overdue non-completed items', async () => {
      const userId = 'user123';
      const pastDate = new Date('2024-01-01');

      const mockOverdueItems = [
        {
          id: 'action1',
          task: 'Overdue task',
          dueDate: pastDate,
          status: ActionItemStatus.PENDING,
          meeting: {
            title: 'Test Meeting',
          },
        },
      ];

      mockPrisma.actionItem.findMany.mockResolvedValue(mockOverdueItems);

      const result = await actionItemsService.getOverdueActionItems(userId);

      expect(result).toHaveLength(1);
      expect(result[0].meeting.title).toBe('Test Meeting');
    });
  });
});
