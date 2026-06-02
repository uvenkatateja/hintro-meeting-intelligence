import { z } from 'zod';

export const transcriptItemSchema = z.object({
  timestamp: z.string(),
  speaker: z.string(),
  text: z.string(),
});

export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  participants: z.array(z.string().email('Each participant must be a valid email')).min(1, 'At least one participant is required'),
  meetingDate: z.string().datetime('Invalid datetime format'),
  transcript: z.array(transcriptItemSchema).min(1, 'Transcript must contain at least one item'),
});

export const getMeetingsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  title: z.string().optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type GetMeetingsQuery = z.infer<typeof getMeetingsQuerySchema>;
