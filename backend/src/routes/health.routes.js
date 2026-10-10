import { Router } from 'express';
import { env } from '../config/env.js';

const router = Router();

/**
 * GET /api/health
 * Simple liveliness check. Does not expose secrets, credentials, or filesystem info.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'truthlens-backend',
    version: '0.1.0',
    details: {
      status: 'Active',
      groqConfigured: env.hasGroqKey,
      geminiConfigured: env.hasGeminiKey || env.hasGroqKey,
      engine: env.hasGroqKey ? `Groq (${env.GROQ_MODEL})` : (env.hasGeminiKey ? `Gemini (${env.GEMINI_MODEL})` : 'Grounded Fallback')
    }
  });
});

export default router;
