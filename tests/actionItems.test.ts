import request from 'supertest';
import { PrismaClient, ActionItemStatus } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

describe('Action Items Integration Tests', () => {
  let authToken: string;
  let meetingId: string;

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.user.deleteMany({});

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Action Test User',
        email: 'actions@example.com',
        password: 'password123',
      });

    authToken = registerResponse.body.data.token;

    const meetingResponse = await request(app)
      .post('/api/meetings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Meeting',
        participants: ['test@example.com'],
        meetingDate: '2024-06-02T14:00:00Z',
        transcript: [{ timestamp: '00:00:01', speaker: 'Test', text: 'Hello' }],
      });

    meetingId = meetingResponse.body.data.id;
  });

  afterAll(async () => {
    await prisma.actionItem.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.actionItem.deleteMany({ where: { meetingId } });
  });

  describe('PATCH /api/action-items/:id/status', () => {
    it('should successfully update status from PENDING to IN_PROGRESS', async () => {
      const createResponse = await request(app)
        .post('/api/action-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Test Task',
          assignee: 'John Doe',
          dueDate: '2024-12-31T23:59:59Z',
          meetingId,
          citations: [{ timestamp: '00:01:00' }],
        });

      const actionItemId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/action-items/${actionItemId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: ActionItemStatus.IN_PROGRESS,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(ActionItemStatus.IN_PROGRESS);
    });

    it('should return 400 when trying to reopen completed item', async () => {
      const createResponse = await request(app)
        .post('/api/action-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Completed Task',
          assignee: 'Jane Doe',
          meetingId,
        });

      const actionItemId = createResponse.body.data.id;

      await request(app)
        .patch(`/api/action-items/${actionItemId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: ActionItemStatus.COMPLETED,
        });

      const response = await request(app)
        .patch(`/api/action-items/${actionItemId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: ActionItemStatus.PENDING,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(response.body.error.message).toBe('Completed items cannot be reopened');
    });
  });

  describe('GET /api/action-items/overdue', () => {
    it('should return only overdue items that are not completed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await request(app)
        .post('/api/action-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Overdue Task',
          assignee: 'John Doe',
          dueDate: pastDate.toISOString(),
          meetingId,
        });

      await request(app)
        .post('/api/action-items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Future Task',
          assignee: 'Jane Doe',
          dueDate: futureDate.toISOString(),
          meetingId,
        });

      const response = await request(app)
        .get('/api/action-items/overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].task).toBe('Overdue Task');
      expect(response.body.data[0].meeting.title).toBe('Test Meeting');
    });
  });
});
