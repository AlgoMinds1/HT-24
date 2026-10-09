import { Router } from 'express';
import { handleVerifyClaim } from '../controllers/verify.controller.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

/**
 * POST /api/verify
 * Unified verification endpoint supporting:
 * - text (application/json)
 * - url (application/json)
 * - image, audio, pdf (multipart/form-data with "file" field)
 */
router.post('/verify', uploadMiddleware.single('file'), handleVerifyClaim);

export default router;
