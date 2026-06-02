import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  traceId?: string
): Response {
  return res.status(statusCode).json({
    traceId,
    success: true,
    data,
  });
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number,
  traceId?: string
): Response {
  return res.status(statusCode).json({
    traceId,
    success: false,
    error: {
      code,
      message,
    },
  });
}
