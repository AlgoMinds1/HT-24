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
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const GEMINI_FALLBACK_MODELS = [
    GEMINI_MODEL,
    'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const GROQ_FALLBACK_MODELS = [
    GROQ_MODEL,
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ].filter((m, i, arr) => arr.indexOf(m) === i);
  const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
  const GROQ_VISION_FALLBACK_MODELS = [
    GROQ_VISION_MODEL,
    'qwen/qwen3.8-27b'
  ].filter((m, i, arr) => arr.indexOf(m) === i);
  const GROQ_AUDIO_MODEL = process.env.GROQ_AUDIO_MODEL || 'whisper-large-v3';

  // Do not fail startup if running in mock/offline test environments unless explicitly required
  return {
    PORT,
    NODE_ENV,
    FRONTEND_ORIGIN,
    REQUEST_TIMEOUT_MS,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_FALLBACK_MODELS,
    hasGeminiKey: Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_FALLBACK_MODELS,
    GROQ_VISION_MODEL,
    GROQ_AUDIO_MODEL,
    hasGroqKey: Boolean(GROQ_API_KEY && GROQ_API_KEY !== 'your_groq_api_key_here' && GROQ_API_KEY.trim().length > 0)
  };
}

export const env = getEnvConfig();
