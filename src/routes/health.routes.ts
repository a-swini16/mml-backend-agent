// ============================================
// Health Check Route
// ============================================

import { Router, Request, Response } from 'express';
import { getRedis } from '../config/redis';
import { config } from '../config';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    services: {},
  };

  // Check Redis
  try {
    const redis = getRedis();
    await redis.ping();
    (health.services as Record<string, string>).redis = 'connected';
  } catch {
    (health.services as Record<string, string>).redis = 'disconnected';
  }

  // Check OpenAI key configured
  (health.services as Record<string, string>).openai = config.openai.apiKey ? 'configured' : 'missing';

  // Check MML API base URL
  (health.services as Record<string, string>).mmlApi = config.mmlApi.baseUrl;

  res.json(health);
});
