import type { Request, Response, NextFunction } from 'express';
import { AppError, handleError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const error = err instanceof AppError ? err : handleError(err);

  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.stack && { stack: error.stack })
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  });
}
