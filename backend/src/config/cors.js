import { env } from './env.js';

/**
 * Predefined trusted production and development origins.
 * Exactly allows the production frontend (https://ht-24.vercel.app) by default.
 */
export const DEFAULT_ALLOWED_ORIGINS = [
  'https://ht-24.vercel.app',
  'https://ht-24.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

/**
 * Returns a normalized Set of allowed origin strings.
 */
export function getAllowedOrigins() {
  const configured = (env.FRONTEND_ORIGIN || '')
    .split(',')
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

/**
 * Checks if a given request origin is permitted under CORS policy.
 * 
 * @param {string|null|undefined} origin
 * @returns {boolean}
 */
export function isOriginAllowed(origin) {
  // Allow requests with no origin (such as mobile apps, curl, Postman, or server-to-server)
  if (!origin) return true;

  const normalized = origin.trim().replace(/\/+$/, '');
  const allowed = getAllowedOrigins();

  if (allowed.has(normalized)) return true;
  if (allowed.has('*')) return true;

  // Allow Vercel preview deployment URLs for this project (e.g. https://ht-24-git-*.vercel.app)
  if (/^https:\/\/ht-24(-[a-z0-9-]+)?\.vercel\.app$/.test(normalized)) {
    return true;
  }

  // Allow any localhost/127.0.0.1 port in development or testing
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Express CORS middleware options.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'HEAD', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'x-skip-cache'
  ],
  exposedHeaders: [
    'Content-Type',
    'Content-Length',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400
};
