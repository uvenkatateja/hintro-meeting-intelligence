import { z } from 'zod';
import { ActionItemStatus } from '@prisma/client';

export const createActionItemSchema = z.object({
  task: z.string().min(1, 'Task is required'),
  assignee: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().datetime().optional(),
  meetingId: z.string().min(1, 'Meeting ID is required'),
  citations: z.array(z.object({ timestamp: z.string() })).optional().default([]),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(ActionItemStatus),
});

export const getActionItemsQuerySchema = z.object({
  status: z.nativeEnum(ActionItemStatus).optional(),
  assignee: z.string().optional(),
  meetingId: z.string().optional(),
});

export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type GetActionItemsQuery = z.infer<typeof getActionItemsQuerySchema>;
