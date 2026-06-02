import { Request, Response } from 'express';
import { actionItemsService } from './actionItems.service';
import { createActionItemSchema, updateStatusSchema, getActionItemsQuerySchema } from './actionItems.schema';
import { sendSuccess, sendError } from '../../utils/response';

export class ActionItemsController {
  async createActionItem(req: Request, res: Response): Promise<void> {
    const input = createActionItemSchema.parse(req.body);
    const userId = req.user!.id;

    try {
      const actionItem = await actionItemsService.createActionItem(userId, input);
      sendSuccess(res, actionItem, 201, req.traceId);
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

  async getActionItems(req: Request, res: Response): Promise<void> {
    const filters = getActionItemsQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const actionItems = await actionItemsService.getActionItems(userId, filters);
    sendSuccess(res, actionItems, 200, req.traceId);
  }

  async getOverdueActionItems(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const actionItems = await actionItemsService.getOverdueActionItems(userId);
    sendSuccess(res, actionItems, 200, req.traceId);
  }

  async updateActionItemStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const input = updateStatusSchema.parse(req.body);
    const userId = req.user!.id;

    try {
      const actionItem = await actionItemsService.updateActionItemStatus(id, userId, input);
      sendSuccess(res, actionItem, 200, req.traceId);
    } catch (error) {
      if ((error as Error).message === 'NOT_FOUND') {
        sendError(res, 'NOT_FOUND', 'Action item not found', 404, req.traceId);
        return;
      }
      if ((error as Error).message === 'FORBIDDEN') {
        sendError(res, 'FORBIDDEN', 'You do not have access to this action item', 403, req.traceId);
        return;
      }
      if ((error as Error).message === 'INVALID_STATUS_TRANSITION') {
        sendError(res, 'INVALID_STATUS_TRANSITION', 'Completed items cannot be reopened', 400, req.traceId);
        return;
      }
      throw error;
    }
  }
}

export const actionItemsController = new ActionItemsController();
