import { Request, Response } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.schema';
import { sendSuccess, sendError } from '../../utils/response';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body);

    try {
      const result = await authService.register(input);
      sendSuccess(res, result, 201, req.traceId);
    } catch (error) {
      if ((error as Error).message === 'EMAIL_EXISTS') {
        sendError(res, 'EMAIL_EXISTS', 'Email already exists', 409, req.traceId);
        return;
      }
      throw error;
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);

    try {
      const result = await authService.login(input);
      sendSuccess(res, result, 200, req.traceId);
    } catch (error) {
      if ((error as Error).message === 'INVALID_CREDENTIALS') {
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401, req.traceId);
        return;
      }
      throw error;
    }
  }
}

export const authController = new AuthController();
