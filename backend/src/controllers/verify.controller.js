import { validateVerificationRequest } from '../validators/input.validator.js';
import { ingestInput } from '../ingest/index.js';
import { verifyTextWithGemini } from '../services/gemini.service.js';

/**
 * Controller handling POST /api/verify for all five input types:
 * text, image, audio, pdf, and url.
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

    // 3. Verify the normalized claim with existing Gemini verification engine
    const verdictPayload = await verifyTextWithGemini(claimText);

    // 4. Enrich verdict with multimodal input metadata and extraction artifacts
    verdictPayload.mode = 'live';
    verdictPayload.input = {
      raw_text: claimText,
      media_type: ingestionResult.inputType,
      received_at: new Date().toISOString(),
      source_platform: ingestionResult.extraction?.sourceUrl || ingestionResult.extraction?.fileName || 'Multimodal Forward'
    };

    // 5. Attach extraction metadata (transcripts, OCR text, readability warnings)
    verdictPayload.extraction = ingestionResult.extraction;

    if (res.headersSent) return;
    return res.status(200).json(verdictPayload);
  } catch (err) {
    if (res.headersSent) return;
    next(err);
  }
}
