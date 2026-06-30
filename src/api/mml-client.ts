// ============================================
// MakeMyLook API Client
// Production HTTP client with caching, retry, rate limiting
// ============================================

import { config } from '../config';
import { logger } from '../utils/logger';
import { cacheManager } from '../cache/cache-manager';
import type { MMLApiResponse, VendorSearchParams } from '../types/vendor.types';

const CACHE_TTL_VENDORS = 300;  // 5 minutes
const CACHE_TTL_CATEGORIES = 3600; // 1 hour

// ---- Rate Limiter (Token Bucket) ----

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ---- Circuit Breaker ----

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true; // half-open
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
      logger.warn(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  getState(): string {
    return this.state;
  }
}

// ---- Main API Client ----

class MMLApiClient {
  private baseUrl: string;
  private rateLimiter: TokenBucket;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.baseUrl = config.mmlApi.baseUrl;
    this.rateLimiter = new TokenBucket(
      config.mmlApi.rateLimit,
      config.mmlApi.rateLimit / 60 // refill per second
    );
    this.circuitBreaker = new CircuitBreaker(5, 30000);
  }

  /**
   * Search vendors using the explore API
   * Endpoint: GET /explore/vendor
   */
  async searchVendors(params: VendorSearchParams): Promise<MMLApiResponse> {
    const queryParams = new URLSearchParams();

    // Required params
    queryParams.set('latitude', params.latitude.toString());
    queryParams.set('longitude', params.longitude.toString());
    queryParams.set('resultFor', params.resultFor || 'vendor');

    // Pagination
    queryParams.set('$limit', (params.limit || 10).toString());
    if (params.skip) queryParams.set('$skip', params.skip.toString());

    // Sorting
    if (params.sortBy) queryParams.set('$sortBy', params.sortBy);
    else queryParams.set('$sortBy', 'createdAt_desc');

    // Optional filters - these may be supported by the API
    if (params.category) queryParams.set('category', params.category);
    if (params.subCategory) queryParams.set('subCategory', params.subCategory);
    if (params.serviceFor) queryParams.set('serviceFor', params.serviceFor);
    if (params.searchQuery) queryParams.set('search', params.searchQuery);
    if (params.providesHomeService !== undefined) {
      queryParams.set('providesHomeService', params.providesHomeService.toString());
    }
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach(tag => queryParams.append('tags', tag));
    }

    const url = `/explore/vendor?${queryParams.toString()}`;
    return this.request<MMLApiResponse>(url);
  }

  /**
   * Core HTTP request method with caching, retry, and circuit breaker
   */
  private async request<T>(path: string): Promise<T> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      logger.warn('Circuit breaker is OPEN, failing fast');
      throw new Error('Service temporarily unavailable. Please try again shortly.');
    }

    // Check rate limiter
    if (!this.rateLimiter.consume()) {
      logger.warn('Rate limit exceeded for MML API');
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    }

    // Check cache first
    const cacheKey = `mml:${this.hashKey(path)}`;
    const cached = await cacheManager.get<T>(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT: ${path}`);
      return cached;
    }

    // Execute with retry
    const fullUrl = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.mmlApi.maxRetries; attempt++) {
      try {
        logger.info(`MML API request [attempt ${attempt}]: ${path}`);
        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.mmlApi.timeout);

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MML-Agent-Backend/1.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as T;
        logger.info(`MML API response [${duration}ms]: ${path}`, {
          status: response.status,
          duration,
        });

        // Cache the result
        const ttl = path.includes('category') ? CACHE_TTL_CATEGORIES : CACHE_TTL_VENDORS;
        await cacheManager.set(cacheKey, data, { ttlSeconds: ttl });

        this.circuitBreaker.recordSuccess();
        return data;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(`MML API attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < config.mmlApi.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await this.sleep(delay);
        }
      }
    }

    this.circuitBreaker.recordFailure();
    throw lastError || new Error('All retry attempts failed');
  }

  private hashKey(input: string): string {
    // Simple hash for cache keys
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit int
    }
    return Math.abs(hash).toString(36);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const mmlClient = new MMLApiClient();
