import { validateVerificationRequest } from '../validators/input.validator.js';
import { ingestInput } from '../ingest/index.js';
import { verifyClaimWithAI } from '../services/ai_verifier.js';
import { verificationCache, VerificationCache } from '../utils/cache.js';

/**
 * Unified verification controller handling POST /api/verify for all five input types:
 * text, image, audio, pdf, and url.
 * Uses Groq or Gemini AI intelligence engine and redirects only to sources from official websites.
 */
export async function handleVerifyClaim(req, res, next) {
  try {
    // 1. Validate request shape and type
    const validatedRequest = validateVerificationRequest(req);

    // 2. Compute deterministic cache key
    const skipCache = req.query.fresh === 'true' || req.headers['x-skip-cache'] === 'true';
    let cacheKey = null;

    if (validatedRequest.inputType === 'text') {
      cacheKey = `text:${VerificationCache.hashKey(validatedRequest.text)}`;
    } else if (validatedRequest.inputType === 'url') {
      cacheKey = `url:${VerificationCache.hashKey(validatedRequest.url)}`;
    } else if (validatedRequest.file && validatedRequest.file.buffer) {
      cacheKey = `${validatedRequest.inputType}:${VerificationCache.hashKey(validatedRequest.file.buffer)}`;
    }

    if (!skipCache && cacheKey) {
      const cachedResult = verificationCache.get(cacheKey);
      if (cachedResult) {
        return res.status(200).json({
          ...cachedResult,
          cached: true,
          cache_hit: true
        });
      }
    }

    // 3. Ingest input through format-specific handler into Unified Claim Contract
    const ingestionResult = await ingestInput(validatedRequest);

    const claimText = ingestionResult.claim?.text;
    if (!claimText || claimText.length < 5) {
      return res.status(400).json({
        error: {
          code: 'UNREADABLE_INPUT',
          message: 'Unable to extract a clear factual claim from the submitted content. Please check the file clarity or provide accompanying context.',
          warnings: ingestionResult.extraction?.warnings || []
        }
      });
    }

    // 4. Verify claim directly using AI (Groq / Gemini) directing only to official website sources (no RAG)
    const verdictPayload = await verifyClaimWithAI(claimText, {
      inputType: ingestionResult.inputType,
      sourcePlatform: ingestionResult.extraction?.sourceUrl || ingestionResult.extraction?.fileName || 'Forwarded Claim',
      extraction: ingestionResult.extraction
    });

    // 6. Enrich verdict with multimodal input metadata and extraction artifacts
    verdictPayload.mode = 'live';
    verdictPayload.cached = false;
    verdictPayload.input = {
      raw_text: claimText,
      media_type: ingestionResult.inputType,
      received_at: new Date().toISOString(),
      source_platform: ingestionResult.extraction?.sourceUrl || ingestionResult.extraction?.fileName || 'Multimodal Forward'
    };

    // 7. Attach extraction metadata & provider status reports
    verdictPayload.extraction = ingestionResult.extraction;
    verdictPayload.retrieval_metadata = {
      mode: 'official_websites_direct',
      provider: verdictPayload.provider || 'ai_verifier',
      official_evidence_count: verdictPayload.evidence ? verdictPayload.evidence.length : 0
    };

    // 8. Cache result for fast replay
    if (cacheKey) {
      verificationCache.set(cacheKey, verdictPayload);
    }

    if (res.headersSent) return;
    return res.status(200).json(verdictPayload);
  } catch (err) {
    if (res.headersSent) return;
    next(err);
  }
}
