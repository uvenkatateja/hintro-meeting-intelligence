import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app';

const prisma = new PrismaClient();

describe('Meetings Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.user.deleteMany({});

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Meeting Test User',
        email: 'meetings@example.com',
        password: 'password123',
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.actionItem.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.actionItem.deleteMany({});
    await prisma.meeting.deleteMany({ where: { userId } });
  });

  describe('POST /api/meetings', () => {
    it('should create a meeting successfully', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Q4 Planning',
          participants: ['alice@example.com', 'bob@example.com'],
          meetingDate: '2024-06-02T14:00:00Z',
          transcript: [
            {
              timestamp: '00:01:00',
              speaker: 'Alice',
              text: 'Let us discuss Q4 goals',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Q4 Planning');
    });

    it('should return 400 on missing fields', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Incomplete Meeting',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .send({
          title: 'No Auth Meeting',
          participants: ['test@example.com'],
          meetingDate: '2024-06-02T14:00:00Z',
          transcript: [{ timestamp: '00:00:01', speaker: 'John', text: 'Hello' }],
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 400 on invalid transcript format', async () => {
      const response = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Transcript',
          participants: ['alice@example.com'],
          meetingDate: '2024-06-02T14:00:00Z',
          transcript: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/meetings', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Meeting 1',
          participants: ['alice@example.com'],
          meetingDate: '2024-06-01T10:00:00Z',
          transcript: [{ timestamp: '00:00:01', speaker: 'Alice', text: 'Hello' }],
        });

      await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Meeting 2',
          participants: ['bob@example.com'],
          meetingDate: '2024-06-02T10:00:00Z',
          transcript: [{ timestamp: '00:00:01', speaker: 'Bob', text: 'Hi' }],
        });
    });

    it('should return paginated meetings', async () => {
      const response = await request(app)
        .get('/api/meetings?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.meetings).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/meetings');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/meetings/:id/analyze', () => {
    it('should return 403 when wrong owner tries to analyze', async () => {
      const meeting = await request(app)
        .post('/api/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Private Meeting',
          participants: ['alice@example.com'],
          meetingDate: '2024-06-02T14:00:00Z',
          transcript: [{ timestamp: '00:00:01', speaker: 'Alice', text: 'Test' }],
        });

      const meetingId = meeting.body.data.id;

      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'another@example.com',
          password: 'password123',
        });

      const anotherToken = anotherUserResponse.body.data.token;

      const response = await request(app)
        .post(`/api/meetings/${meetingId}/analyze`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
