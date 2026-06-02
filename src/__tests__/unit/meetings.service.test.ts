import { MeetingsService } from '../../modules/meetings/meetings.service';

jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    meeting: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
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

describe('MeetingsService', () => {
  let meetingsService: MeetingsService;

  beforeEach(() => {
    meetingsService = new MeetingsService();
    jest.clearAllMocks();
  });

  describe('createMeeting', () => {
    it('should successfully create a meeting', async () => {
      const userId = 'user123';
      const input = {
        title: 'Q4 Planning',
        participants: ['alice@example.com'],
        meetingDate: '2024-06-02T14:00:00Z',
        transcript: [{ timestamp: '00:01:00', speaker: 'Alice', text: 'Hello' }],
      };

      const mockMeeting = {
        id: 'meeting123',
        ...input,
        meetingDate: new Date(input.meetingDate),
        userId,
        analysis: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.meeting.create.mockResolvedValue(mockMeeting);

      const result = await meetingsService.createMeeting(userId, input);

      expect(mockPrisma.meeting.create).toHaveBeenCalledWith({
        data: {
          title: input.title,
          participants: input.participants,
          meetingDate: new Date(input.meetingDate),
          transcript: input.transcript,
          userId,
        },
      });
      expect(result).toEqual(mockMeeting);
    });
  });

  describe('getMeetings', () => {
    it('should return paginated meetings', async () => {
      const params = {
        userId: 'user123',
        page: 1,
        limit: 10,
      };

      const mockMeetings = [
        {
          id: 'meeting1',
          title: 'Meeting 1',
          userId: 'user123',
        },
      ];

      mockPrisma.meeting.findMany.mockResolvedValue(mockMeetings);
      mockPrisma.meeting.count.mockResolvedValue(1);

      const result = await meetingsService.getMeetings(params);

      expect(result.meetings).toEqual(mockMeetings);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });
  });
});
