import { Router } from 'express';
import { handleVerifyClaim } from '../controllers/verify.controller.js';

const router = Router();

/**
 * POST /api/verify
 * Accepts text claims, validates input, queries Gemini, validates against schema.
 */
router.post('/verify', handleVerifyClaim);

export default router;
