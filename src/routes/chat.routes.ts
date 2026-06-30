// ============================================
// Chat Routes — Standard + SSE Streaming
// ============================================

import { Router, Request, Response } from 'express';
import { Pipeline } from '../pipeline';
import { logger } from '../utils/logger';
import rateLimit from 'express-rate-limit';
import type { ChatRequest } from '../types/agent.types';

export const chatRouter = Router();

// Rate limiting for chat endpoint
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: {
    error: 'Too many requests. Please wait a moment before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/chat — Standard request/response
 */
chatRouter.post('/chat', chatLimiter, async (req: Request, res: Response) => {
  try {
    const { message, sessionId, latitude, longitude } = req.body as ChatRequest;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: 'Message is too long.' });
      return;
    }

    logger.info('Chat request received', {
      sessionId,
      messageLength: message.length,
      hasLocation: !!(latitude && longitude),
    });

    const response = await Pipeline.process({
      message: message.trim(),
      sessionId,
      latitude,
      longitude,
    });

    res.json(response);

  } catch (error) {
    logger.error('Chat endpoint error:', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: 'Something went wrong. Please try again.',
      sessionId: req.body?.sessionId,
    });
  }
});

/**
 * POST /api/chat/stream — SSE streaming response
 */
chatRouter.post('/chat/stream', chatLimiter, async (req: Request, res: Response) => {
  try {
    const { message, sessionId, latitude, longitude } = req.body as ChatRequest;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility
    res.flushHeaders();

    await Pipeline.process({
      message: message.trim(),
      sessionId,
      latitude,
      longitude,
    }, (event, data) => {
      sendSSE(res, event, data);
    });

    res.end();

  } catch (error) {
    logger.error('Stream endpoint error:', {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      sendSSE(res, 'error', {
        message: 'Something went wrong. Please try again.',
      });
      res.end();
    } catch {
      // Response may already be ended
    }
  }
});

function sendSSE(res: Response, event: string, data: Record<string, unknown>): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
