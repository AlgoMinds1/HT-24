import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';

/**
 * Enforces per-request timeouts.
 */
export function requestTimeoutMiddleware(timeoutMs = env.REQUEST_TIMEOUT_MS) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(ApiError.timeout(`Request exceeded ${timeoutMs}ms limit.`));
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}
