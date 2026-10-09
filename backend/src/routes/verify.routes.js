import { Router } from 'express';
import { handleVerifyClaim } from '../controllers/verify.controller.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { retrieverService } from '../retrieval/retriever.service.js';

// TruthLens Claim Verification Routes - Grounded Retrieval Active
const router = Router();

/**
 * POST /api/verify
 * Unified verification endpoint supporting:
 * - text (application/json)
 * - url (application/json)
 * - image, audio, pdf (multipart/form-data with "file" field)
 */
router.post('/verify', uploadMiddleware.single('file'), handleVerifyClaim);

/**
 * GET /api/inspect-evidence
 * Inspects retrieved evidence, provider status, and quote validation for a given claim.
 */
router.get('/inspect-evidence', async (req, res, next) => {
  try {
    const claim = (req.query.claim || 'Drinking warm lemon water and baking soda cures cancer').toString();
    const result = await retrieverService.retrieveEvidence(claim);
    return res.status(200).json({
      claim,
      queryTokens: (await import('../retrieval/vector_store.js')).tokenize(claim),
      ...result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/test-verify-claim
 * Test helper executing the complete verification pipeline with retrieval and verdict generation.
 */
router.get('/test-verify-claim', async (req, res, next) => {
  try {
    const claim = (req.query.claim || 'Eating purple quartz crystals gives humans telepathy').toString();
    const { verifyTextWithGemini, buildUnconfirmedPayload } = await import('../services/gemini.service.js');

    const { evidence, retrieval_metadata } = await retrieverService.retrieveEvidence(claim);

    let verdictPayload;
    if (!evidence || evidence.length === 0) {
      verdictPayload = buildUnconfirmedPayload(claim, retrieval_metadata);
    } else {
      verdictPayload = await verifyTextWithGemini(claim, evidence);
    }

    verdictPayload.mode = 'live';
    verdictPayload.retrieval_metadata = retrieval_metadata;
    return res.status(200).json(verdictPayload);
  } catch (err) {
    next(err);
  }
});

export default router;
