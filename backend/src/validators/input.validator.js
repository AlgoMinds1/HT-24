import { ApiError } from '../utils/api-error.js';

const VALID_INPUT_TYPES = ['text', 'image', 'audio', 'pdf', 'url'];

/**
 * Validates request parameters and input type for verification requests.
 * 
 * @param {Object} req - Express request object
 * @returns {{ inputType: 'text'|'image'|'audio'|'pdf'|'url', text?: string, url?: string, file?: Object }}
 */
export function validateVerificationRequest(req) {
  const body = req.body || {};
  const rawType = (body.inputType || body.type || 'text').toString().toLowerCase().trim();

  if (!VALID_INPUT_TYPES.includes(rawType)) {
    throw ApiError.unsupportedMediaType(
      `Unsupported input type: "${rawType}". Supported types: text, image, audio, pdf, url.`,
      'UNSUPPORTED_INPUT_TYPE'
    );
  }

  const result = {
    inputType: rawType
  };

  if (rawType === 'text') {
    const rawText = body.text || body.content || body.raw_text;
    if (typeof rawText !== 'string' || !rawText.trim()) {
      throw ApiError.badRequest('Please provide a non-empty text claim to verify.', 'MISSING_TEXT');
    }
    const trimmed = rawText.trim();
    if (trimmed.length < 10) {
      throw ApiError.badRequest('Text claim is too short. Please provide at least 10 characters.', 'TEXT_TOO_SHORT');
    }
    if (trimmed.length > 5000) {
      throw ApiError.badRequest('Text claim exceeds maximum limit of 5,000 characters.', 'TEXT_TOO_LONG');
    }
    result.text = trimmed;
  } else if (rawType === 'url') {
    const rawUrl = body.url || body.text || body.content;
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      throw ApiError.badRequest('Please provide a webpage URL to verify.', 'MISSING_URL');
    }
    result.url = rawUrl.trim();
  } else {
    // image, audio, pdf
    if (!req.file) {
      throw ApiError.badRequest(
        `Please attach a valid ${rawType} file under the "file" form field.`,
        `MISSING_${rawType.toUpperCase()}_FILE`
      );
    }
    result.file = req.file;
  }

  return result;
}
