import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import logger from '../config/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred', {
    traceId: req.traceId,
    errorMessage: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  if (error instanceof ZodError) {
    const fieldErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    res.status(400).json({
      traceId: req.traceId,
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: fieldErrors,
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        traceId: req.traceId,
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this unique field already exists',
        },
      });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({
        traceId: req.traceId,
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
      return;
    }
  }

  if ((error as Error & { statusCode?: number }).statusCode === 429) {
    res.status(429).json({
      traceId: req.traceId,
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: error.message || 'Too many requests',
      },
    });
    return;
  }

  res.status(500).json({
    traceId: req.traceId,
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
