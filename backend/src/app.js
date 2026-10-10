import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { requestTimeoutMiddleware } from './middleware/request-timeout.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import healthRoutes from './routes/health.routes.js';
import verifyRoutes from './routes/verify.routes.js';
import { ApiError } from './utils/api-error.js';

export function createApp() {
  const app = express();

  // 1. CORS Configuration (Registered before any parsers, routes, or error handlers)
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // 2. Request Parsers & Limiters
  app.use(express.json({ limit: '100kb' }));

  // 3. Request Timeout Middleware
  app.use(requestTimeoutMiddleware(env.REQUEST_TIMEOUT_MS));

  // 4. API Routes (mounted on both /api and root / for seamless frontend compatibility)
  app.use('/api', healthRoutes);
  app.use('/api', verifyRoutes);
  app.use('/', healthRoutes);
  app.use('/', verifyRoutes);

  // 5. Catch-all 404 Handler
  app.use((req, res, next) => {
    next(new ApiError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found.`));
  });

  // 6. Central Error Handler Middleware
  app.use(errorHandlerMiddleware);

  return app;
}

export const app = createApp();
