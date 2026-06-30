import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL || 'qwen/qwen3.5-397b-a17b',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    routerModel: process.env.OPENAI_ROUTER_MODEL || 'qwen/qwen3.5-397b-a17b',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  chromadb: {
    url: process.env.CHROMADB_URL || 'http://localhost:8000',
    collection: process.env.CHROMADB_COLLECTION || 'mml_knowledge',
  },

  mmlApi: {
    baseUrl: process.env.MML_API_BASE_URL || 'https://api.makemylook.beauty',
    websiteUrl: process.env.MML_WEBSITE_URL || 'https://makemylook.beauty',
    timeout: parseInt(process.env.MML_API_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.MML_API_MAX_RETRIES || '3', 10),
    rateLimit: parseInt(process.env.MML_API_RATE_LIMIT || '30', 10),
  },

  defaults: {
    latitude: parseFloat(process.env.DEFAULT_LATITUDE || '20.2961'),
    longitude: parseFloat(process.env.DEFAULT_LONGITUDE || '85.8245'),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  session: {
    ttl: parseInt(process.env.SESSION_TTL || '86400', 10),
    maxMessages: parseInt(process.env.MAX_CONVERSATION_MESSAGES || '20', 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },
} as const;
