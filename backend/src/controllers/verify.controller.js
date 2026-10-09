import { validateVerificationInput } from '../validators/input.validator.js';
import { verifyTextWithGemini } from '../services/gemini.service.js';

/**
 * Controller handling POST /api/verify
 */
export async function handleVerifyClaim(req, res, next) {
  try {
    const { text } = validateVerificationInput(req.body);

    const verdictPayload = await verifyTextWithGemini(text);

    // Attach mode: 'live' for frontend distinction
    verdictPayload.mode = 'live';

    return res.status(200).json(verdictPayload);
  } catch (err) {
    next(err);
  }
}
