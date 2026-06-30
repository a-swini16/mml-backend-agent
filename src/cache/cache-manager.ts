import { LRUCache } from 'lru-cache';
import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttlSeconds: number;
}

class CacheManager {
  private memoryCache: LRUCache<string, string>;
  private isRedisAvailable = false;

  constructor() {
    this.memoryCache = new LRUCache({
      max: 10000,
      ttl: 1000 * 60 * 60, // Default 1 hour memory TTL
    });

    this.checkRedis();
  }

  private async checkRedis() {
    try {
      const redis = getRedis();
      await redis.ping();
      this.isRedisAvailable = true;
    } catch {
      this.isRedisAvailable = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisAvailable) {
        const redis = getRedis();
        const data = await redis.get(key);
        if (data) return JSON.parse(data) as T;
      }
    } catch (error) {
      this.isRedisAvailable = false;
      logger.warn(`Redis GET failed for ${key}, falling back to memory`, { error });
    }

    // Memory fallback
    const memData = this.memoryCache.get(key);
    if (memData) return JSON.parse(memData) as T;

    return null;
  }

  async set(key: string, value: unknown, options: CacheOptions): Promise<void> {
    const stringValue = JSON.stringify(value);

    // Always set in memory for ultra-fast fallback access
    this.memoryCache.set(key, stringValue, { ttl: options.ttlSeconds * 1000 });

    try {
      if (this.isRedisAvailable) {
        const redis = getRedis();
        await redis.setex(key, options.ttlSeconds, stringValue);
      }
    } catch (error) {
      this.isRedisAvailable = false;
      logger.warn(`Redis SET failed for ${key}, falling back to memory`, { error });
    }
  }
}

export const cacheManager = new CacheManager();

export const CACHE_TTL = {
  VENDOR: 5 * 60,       // 5 minutes
  COUPON: 15 * 60,      // 15 minutes
  CATEGORY: 60 * 60,    // 1 hour
  FAQ: 24 * 60 * 60,    // 24 hours
};
