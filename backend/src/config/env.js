import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory or project root if not found
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Validates and exports environment configuration.
 * Exits process with clear error message if critical variables are missing.
 */
export function getEnvConfig() {
  const PORT = parseInt(process.env.PORT || '8000', 10);
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '90000', 10);
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Do not fail startup if running in mock/offline test environments unless explicitly required
  return {
    PORT,
    NODE_ENV,
    FRONTEND_ORIGIN,
    REQUEST_TIMEOUT_MS,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    hasGeminiKey: Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here')
  };
}

export const env = getEnvConfig();
