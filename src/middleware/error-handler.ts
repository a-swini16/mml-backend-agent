// ============================================
// Global Error Handler Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
  });

  // Never expose internal errors to the client
  res.status(500).json({
    error: 'Something went wrong on our end. Please try again in a moment.',
  });
}
