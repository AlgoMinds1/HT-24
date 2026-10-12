import { Router } from 'express';
import { 
  handleVerifyClaim,
  handleStreamById,
  handleAbortVerification 
} from '../controllers/verify.controller.js';
import { uploadMiddleware } from '../middleware/upload.js';
import { verificationCache } from '../utils/cache.js';

// TruthLens Claim Verification Routes - Grounded Retrieval Active
const router = Router();

/**
 * POST /api/verify
 * Unified verification endpoint supporting:
 * - text (application/json)
 * - url (application/json)
 * - image, audio, pdf (multipart/form-data with "file" field)
 * Supports ?stream=true for real-time SSE Dual-Agent event stream.
 */
router.post('/verify', uploadMiddleware, handleVerifyClaim);

/**
 * GET /api/verify/stream/:id
 * Connects or reconnects to an ongoing or completed investigation session via SSE.
 */
router.get('/verify/stream/:id', handleStreamById);

/**
 * POST /api/verify/abort/:id
 * Cancels a live investigation session.
 */
router.post('/verify/abort/:id', handleAbortVerification);

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
 * Inspects official evidence citations and domain provenance for a given claim.
 */
router.get('/inspect-evidence', async (req, res, next) => {
  try {
    const claim = (req.query.claim || 'Drinking warm lemon water and baking soda cures cancer').toString();
    const { sanitizeOfficialEvidence, getDefaultOfficialSources } = await import('../utils/official_sources.js');
    const evidence = getDefaultOfficialSources(claim);
    return res.status(200).json({
      claim,
      official_evidence: evidence,
      total_retrieved: evidence.length,
      redirect_policy: 'Official websites only'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/test-verify-claim
 * Test helper executing the verification pipeline directing only to official website sources.
 */
router.get('/test-verify-claim', async (req, res, next) => {
  try {
    const claim = (req.query.claim || 'Eating purple quartz crystals gives humans telepathy').toString();
    const { verifyClaimWithAI } = await import('../services/ai_verifier.js');
    const verdictPayload = await verifyClaimWithAI(claim);
    return res.status(200).json(verdictPayload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/redirect
 * Safe official website redirection endpoint.
 */
router.get('/redirect', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid or missing target URL');
  }
  return res.redirect(targetUrl);
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
 * GET /api/run-cors-tests
 * Runs the comprehensive CORS & Preflight verification test suite.
 */
router.get('/run-cors-tests', async (req, res) => {
  try {
    const { runCorsTests } = await import(`../../test/cors.test.js?t=${Date.now()}`);
    const results = await runCorsTests();
    return res.status(results.success ? 200 : 500).json(results);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, stack: err.stack });
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
