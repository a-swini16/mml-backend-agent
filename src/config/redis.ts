import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // Fails fast if Redis isn't running
      retryStrategy(times) {
        // Stop retrying after 3 attempts if there's no connection
        if (times > 3) return null; 
        const delay = Math.min(times * 200, 1000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('error', (err: any) => {
      logger.error(`Redis error: ${err?.message || err}`);
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  await redis.ping();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
