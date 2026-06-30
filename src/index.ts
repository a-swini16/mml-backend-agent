// ============================================
// Express Server Entry Point
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis } from './config/redis';
import { chatRouter } from './routes/chat.routes';
import { healthRouter } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

const app = express();

// ---- Middleware ----
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ---- Routes ----
app.use('/api', chatRouter);
app.use('/api', healthRouter);

// ---- Error Handler ----
app.use(errorHandler);

// ---- Start Server ----
async function startServer() {
  try {
    // Connect to Redis
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (err) {
      logger.warn('Redis connection failed — running without session persistence', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    app.listen(config.port, () => {
      logger.info(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🌟 MakeMyLook AI Agent Backend                 ║
║   Running on port ${config.port}                        ║
║   Environment: ${config.nodeEnv}                  ║
║                                                  ║
║   API:   http://localhost:${config.port}/api/chat        ║
║   Health: http://localhost:${config.port}/api/health     ║
║                                                  ║
╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

startServer();
