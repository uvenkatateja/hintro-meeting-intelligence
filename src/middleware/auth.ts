import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../utils/response';

interface JwtPayload {
  id: string;
  email: string;
  name: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    sendError(res, 'NO_TOKEN', 'No token provided', 401, req.traceId);
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (!token) {
    sendError(res, 'NO_TOKEN', 'No token provided', 401, req.traceId);
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'TOKEN_EXPIRED', 'Token has expired', 401, req.traceId);
      return;
    }
    sendError(res, 'UNAUTHORIZED', 'Invalid token', 401, req.traceId);
  }
}
