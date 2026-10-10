import { Router } from 'express';
import { handleVerifyClaim } from '../controllers/verify.controller.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { retrieverService } from '../retrieval/retriever.service.js';
import { verificationCache } from '../utils/cache.js';

// TruthLens Claim Verification Routes - Grounded Retrieval Active
const router = Router();

/**
 * POST /api/verify
 * Unified verification endpoint supporting:
 * - text (application/json)
 * - url (application/json)
 * - image, audio, pdf (multipart/form-data with "file" field)
 */
router.post('/verify', uploadMiddleware, handleVerifyClaim);

/**
 * GET /api/cache/stats
 * Returns in-memory LRU cache statistics.
 */
router.get('/cache/stats', (req, res) => {
  res.status(200).json(verificationCache.getStats());
});

/**
 * POST /api/cache/clear
 * Clears verification cache.
 */
router.post('/cache/clear', (req, res) => {
  verificationCache.clear();
  res.status(200).json({ success: true, message: 'Verification cache cleared.' });
});

router.get('/cache/clear-all', (req, res) => {
  verificationCache.clear();
  res.status(200).json({ success: true, message: 'Verification cache cleared.' });
});

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
    const { verifyTextWithGroq, buildUnconfirmedPayload } = await import('../services/groq.service.js');

    const { evidence, retrieval_metadata } = await retrieverService.retrieveEvidence(claim);

    let verdictPayload;
    if (!evidence || evidence.length === 0) {
      verdictPayload = buildUnconfirmedPayload(claim, retrieval_metadata);
    } else {
      verdictPayload = await verifyTextWithGroq(claim, evidence);
    }

    verdictPayload.mode = 'live';
    verdictPayload.retrieval_metadata = retrieval_metadata;
    return res.status(200).json(verdictPayload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/run-unit-tests
 * Runs the comprehensive 10-requirement grounding & verdict accuracy test suite.
 */
router.get('/run-unit-tests', async (req, res) => {
  try {
    const { runGroundingTests } = await import(`../../test/grounding-and-verdict.test.js?t=${Date.now()}`);
    const results = runGroundingTests();
    return res.status(200).json(results);
  } catch (err) {
    return res.status(200).json({ success: false, error: err.message, stack: err.stack });
  }
});

/**
 * GET /api/reindex-kb
 * Reindexes all documents in kb/documents into the vector store.
 */
router.get('/reindex-kb', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { chunkDocument } = await import('../retrieval/chunker.js');
    const { vectorStore } = await import('../retrieval/vector_store.js');

    const kbDocsDir = path.resolve(process.cwd(), '../kb/documents');
    const docFiles = fs.readdirSync(kbDocsDir).filter(f => f.endsWith('.json'));
    const allChunks = [];

    for (const file of docFiles) {
      const raw = fs.readFileSync(path.join(kbDocsDir, file), 'utf-8');
      const doc = JSON.parse(raw);
      const chunks = chunkDocument(doc, { maxWordsPerChunk: 70, overlapSentences: 1 });
      allChunks.push(...chunks);
    }

    const indexedCount = await vectorStore.addChunks(allChunks);
    vectorStore.load(); // reload in-memory cache
    return res.status(200).json({ success: true, count: indexedCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
