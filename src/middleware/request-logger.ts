import type { Request, Response, NextFunction } from 'express';
import logger, { createLogger } from '../utils/logger';
import { generateRequestId } from '../utils';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  req.headers['x-request-id'] = requestId;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
  });

  next();
}

export function createContextLogger(context: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    (req as any).contextLogger = createLogger(context);
    next();
  };
}
