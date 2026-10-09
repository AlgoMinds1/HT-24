import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { requestTimeoutMiddleware } from './middleware/request-timeout.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import healthRoutes from './routes/health.routes.js';
import verifyRoutes from './routes/verify.routes.js';
import { ApiError } from './utils/api-error.js';

export function createApp() {
  const app = express();

  // 1. CORS Configuration
  const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map(o => o.trim());

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        (env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        return callback(null, true);
      }
      return callback(ApiError.badRequest(`Origin ${origin} is not allowed by CORS policy.`, 'CORS_ERROR'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
  }));

  // 2. Request Parsers & Limiters
  app.use(express.json({ limit: '100kb' }));

  // 3. Request Timeout Middleware
  app.use(requestTimeoutMiddleware(env.REQUEST_TIMEOUT_MS));

  // 4. API Routes
  app.use('/api', healthRoutes);
  app.use('/api', verifyRoutes);

  // 5. Catch-all 404 Handler
  app.use((req, res, next) => {
    next(new ApiError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found.`));
  });

  // 6. Central Error Handler Middleware
  app.use(errorHandlerMiddleware);

  return app;
}

export const app = createApp();
