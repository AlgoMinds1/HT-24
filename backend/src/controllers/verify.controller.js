import { validateVerificationRequest } from '../validators/input.validator.js';
import { ingestInput } from '../ingest/index.js';
import { verifyTextWithGemini, buildUnconfirmedPayload } from '../services/gemini.service.js';
import { retrieverService } from '../retrieval/retriever.service.js';

/**
 * Controller handling POST /api/verify for all five input types:
 * text, image, audio, pdf, and url.
 * Incorporates Phase 5 Grounded Evidence Retrieval and strict UNCONFIRMED constraints.
 */
export async function handleVerifyClaim(req, res, next) {
  try {
    // 1. Validate request shape and type
    const validatedRequest = validateVerificationRequest(req);

    // 2. Ingest input through format-specific handler into Unified Claim Contract
    const ingestionResult = await ingestInput(validatedRequest);

    const claimText = ingestionResult.claim?.text;
    if (!claimText || claimText.length < 5) {
      return res.status(400).json({
        error: {
          code: 'UNREADABLE_INPUT',
          message: 'Unable to extract a clear factual claim from the submitted content.',
          warnings: ingestionResult.extraction?.warnings || []
        }
      });
    }

    // 3. Phase 5 Grounded Evidence Retrieval across Curated KB, Fact Check API, and Search
    const { evidence, retrieval_metadata } = await retrieverService.retrieveEvidence(claimText);

    let verdictPayload;

    // 4. Strict Epistemic Constraint:
    // If no useful evidence was found, return UNCONFIRMED. Never present unsupported claims as confirmed.
    if (!evidence || evidence.length === 0) {
      verdictPayload = buildUnconfirmedPayload(claimText, retrieval_metadata);
    } else {
      verdictPayload = await verifyTextWithGemini(claimText, evidence);
    }

    // 5. Enrich verdict with multimodal input metadata and extraction artifacts
    verdictPayload.mode = 'live';
    verdictPayload.input = {
      raw_text: claimText,
      media_type: ingestionResult.inputType,
      received_at: new Date().toISOString(),
      source_platform: ingestionResult.extraction?.sourceUrl || ingestionResult.extraction?.fileName || 'Multimodal Forward'
    };

    // 6. Attach extraction metadata & retrieval provider status reports
    verdictPayload.extraction = ingestionResult.extraction;
    verdictPayload.retrieval_metadata = retrieval_metadata;

    if (res.headersSent) return;
    return res.status(200).json(verdictPayload);
  } catch (err) {
    if (res.headersSent) return;
    next(err);
  }
}
