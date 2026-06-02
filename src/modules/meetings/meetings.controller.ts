import { Request, Response } from 'express';
import { meetingsService } from './meetings.service';
import { createMeetingSchema, getMeetingsQuerySchema } from './meetings.schema';
import { sendSuccess, sendError } from '../../utils/response';

export class MeetingsController {
  async createMeeting(req: Request, res: Response): Promise<void> {
    const input = createMeetingSchema.parse(req.body);
    const userId = req.user!.id;

    const meeting = await meetingsService.createMeeting(userId, input);
    sendSuccess(res, meeting, 201, req.traceId);
  }

  async getMeetings(req: Request, res: Response): Promise<void> {
    const query = getMeetingsQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 50);

    const result = await meetingsService.getMeetings({
      userId,
      page,
      limit,
      title: query.title,
    });

    sendSuccess(res, result, 200, req.traceId);
  }

  async getMeetingById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
      const meeting = await meetingsService.getMeetingById(id, userId);
      sendSuccess(res, meeting, 200, req.traceId);
    } catch (error) {
      if ((error as Error).message === 'NOT_FOUND') {
        sendError(res, 'NOT_FOUND', 'Meeting not found', 404, req.traceId);
        return;
      }
      if ((error as Error).message === 'FORBIDDEN') {
        sendError(res, 'FORBIDDEN', 'You do not have access to this meeting', 403, req.traceId);
        return;
      }
      throw error;
    }
  }

  async analyzeMeeting(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
      const meeting = await meetingsService.analyzeMeeting(id, userId);
      sendSuccess(res, meeting, 200, req.traceId);
    } catch (error) {
      if ((error as Error).message === 'NOT_FOUND') {
        sendError(res, 'NOT_FOUND', 'Meeting not found', 404, req.traceId);
        return;
      }
      if ((error as Error).message === 'FORBIDDEN') {
        sendError(res, 'FORBIDDEN', 'You do not have access to this meeting', 403, req.traceId);
        return;
      }
      if ((error as Error).message === 'AI_PARSE_ERROR') {
        sendError(res, 'AI_PARSE_ERROR', 'AI returned malformed response', 502, req.traceId);
        return;
      }
      throw error;
    }
  }
}

export const meetingsController = new MeetingsController();
