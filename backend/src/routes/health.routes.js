import { Router } from 'express';

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
    version: '0.1.0'
  });
});

export default router;
