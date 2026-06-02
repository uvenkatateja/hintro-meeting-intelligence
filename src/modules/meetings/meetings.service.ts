import { PrismaClient, Meeting } from '@prisma/client';
import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { CreateMeetingInput } from './meetings.schema';
import redis from '../../config/redis';
import logger from '../../config/logger';

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: env.GROQ_API_KEY });

interface GetMeetingsParams {
  userId: string;
  page: number;
  limit: number;
  title?: string;
}

interface GetMeetingsResult {
  meetings: Meeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AIAnalysis {
  summary: Array<{ text: string; citations: Array<{ timestamp: string }> }>;
  actionItems: Array<{
    task: string;
    assignee: string;
    dueDate: string | null;
    citations: Array<{ timestamp: string }>;
  }>;
  decisions: Array<{ text: string; citations: Array<{ timestamp: string }> }>;
  followUpSuggestions: Array<{ text: string; citations: Array<{ timestamp: string }> }>;
}

export class MeetingsService {
  async createMeeting(userId: string, input: CreateMeetingInput): Promise<Meeting> {
    const meeting = await prisma.meeting.create({
      data: {
        title: input.title,
        participants: input.participants,
        meetingDate: new Date(input.meetingDate),
        transcript: input.transcript,
        userId,
      },
    });

    try {
      const cachePattern = `meetings:${userId}:*`;
      const keys = await redis.keys(cachePattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Failed to invalidate meetings cache', { error: (error as Error).message });
    }

    return meeting;
  }

  async getMeetings(params: GetMeetingsParams): Promise<GetMeetingsResult> {
    const { userId, page, limit, title } = params;
    const skip = (page - 1) * limit;

    const cacheKey = `meetings:${userId}:page:${page}:limit:${limit}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for meetings', { cacheKey });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Failed to read from cache', { error: (error as Error).message });
    }

    const where = {
      userId,
      ...(title && {
        title: {
          contains: title,
          mode: 'insensitive' as const,
        },
      }),
    };

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.meeting.count({ where }),
    ]);

    const result: GetMeetingsResult = {
      meetings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    try {
      await redis.setex(cacheKey, 60, JSON.stringify(result));
    } catch (error) {
      logger.warn('Failed to write to cache', { error: (error as Error).message });
    }

    return result;
  }

  async getMeetingById(meetingId: string, userId: string): Promise<Meeting> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new Error('NOT_FOUND');
    }

    if (meeting.userId !== userId) {
      throw new Error('FORBIDDEN');
    }

    return meeting;
  }

  async analyzeMeeting(meetingId: string, userId: string): Promise<Meeting> {
    const meeting = await this.getMeetingById(meetingId, userId);

    const systemPrompt = `You are a meeting intelligence assistant. Your job is to analyze meeting transcripts and extract structured insights.

STRICT RULES:
- Only use information explicitly stated in the transcript
- Never invent attendees, decisions, action items, or outcomes
- Never add information not present in the transcript
- Every insight must cite the exact transcript timestamp(s) it came from
- Return ONLY valid JSON. No markdown. No explanation. No preamble.

Return this exact JSON structure:
{
  "summary": [{ "text": "...", "citations": [{ "timestamp": "..." }] }],
  "actionItems": [{ "task": "...", "assignee": "...", "dueDate": null, "citations": [{ "timestamp": "..." }] }],
  "decisions": [{ "text": "...", "citations": [{ "timestamp": "..." }] }],
  "followUpSuggestions": [{ "text": "...", "citations": [{ "timestamp": "..." }] }]
}

If no action items exist in the transcript, return empty array. Same for decisions and followUpSuggestions.`;

    const userMessage = JSON.stringify(meeting.transcript, null, 2);

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4096,
    });

    let responseText = completion.choices[0]?.message?.content || '';

    responseText = responseText.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '').trim();

    let analysis: AIAnalysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (error) {
      logger.error('Failed to parse AI response', { responseText, error: (error as Error).message });
      throw new Error('AI_PARSE_ERROR');
    }

    if (
      !analysis.summary ||
      !Array.isArray(analysis.actionItems) ||
      !Array.isArray(analysis.decisions) ||
      !Array.isArray(analysis.followUpSuggestions)
    ) {
      logger.error('AI response missing required keys', { analysis });
      throw new Error('AI_PARSE_ERROR');
    }

    await prisma.actionItem.deleteMany({
      where: { meetingId },
    });

    if (analysis.actionItems.length > 0) {
      await prisma.actionItem.createMany({
        data: analysis.actionItems.map((item) => {
          let dueDate: Date | null = null;
          if (item.dueDate) {
            const parsedDate = new Date(item.dueDate);
            if (!isNaN(parsedDate.getTime())) {
              dueDate = parsedDate;
            }
          }
          
          return {
            task: item.task,
            assignee: item.assignee,
            dueDate,
            meetingId,
            citations: item.citations,
          };
        }),
      });
    }

    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: { analysis: JSON.parse(JSON.stringify(analysis)) },
    });

    try {
      const cachePattern = `meetings:${userId}:*`;
      const keys = await redis.keys(cachePattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Failed to invalidate meetings cache', { error: (error as Error).message });
    }

    return updatedMeeting;
  }
}

export const meetingsService = new MeetingsService();
