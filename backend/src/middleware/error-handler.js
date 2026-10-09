import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';

/**
 * Central Express Error-Handling Middleware
 */
export function errorHandlerMiddleware(err, req, res, next) {
  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle malformed JSON request bodies from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'The request body contains invalid JSON syntax.'
      }
    });
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds the maximum allowed limit of 100kb.'
      }
    });
  }

  // Handle known operational ApiErrors
  if (err instanceof ApiError) {
    const response = {
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details) {
      response.error.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle unexpected internal errors
  const isDev = env.NODE_ENV === 'development';
  console.error('Unhandled internal error:', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred while processing the verification request.'
    }
  });
}
