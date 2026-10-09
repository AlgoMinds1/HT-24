import { ApiError } from '../utils/api-error.js';

const SUPPORTED_INPUT_TYPE = 'text';
const UNSUPPORTED_TYPES = ['image', 'audio', 'pdf', 'url', 'video'];

/**
 * Validates verification request body.
 * 
 * @param {Object} body
 * @returns {{ text: string, inputType: 'text' }} Sanitized and validated request payload
 */
export function validateVerificationInput(body) {
  if (!body || typeof body !== 'object') {
    throw ApiError.badRequest('Request body must be a valid JSON object.', 'INVALID_REQUEST_BODY');
  }

  const rawType = (body.inputType || body.type || 'text').toString().toLowerCase().trim();

  if (UNSUPPORTED_TYPES.includes(rawType)) {
    throw ApiError.unsupportedMediaType(
      `Live verification currently supports text input only. Multimodal verification (${rawType}) is scheduled for a future release. Please submit a text forward or switch to mock mode.`,
      'UNSUPPORTED_INPUT_TYPE'
    );
  }

  if (rawType !== SUPPORTED_INPUT_TYPE) {
    throw ApiError.unsupportedMediaType(
      `Unsupported input type: "${rawType}". Please submit a text claim with inputType: "text".`,
      'UNSUPPORTED_INPUT_TYPE'
    );
  }

  const rawText = body.text || body.content || body.raw_text;

  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw ApiError.badRequest(
      'Please provide a non-empty text claim to verify.',
      'MISSING_TEXT'
    );
  }

  const trimmedText = rawText.trim();

  if (trimmedText.length < 10) {
    throw ApiError.badRequest(
      'Text claim is too short. Please provide at least 10 characters for meaningful verification.',
      'TEXT_TOO_SHORT'
    );
  }

  if (trimmedText.length > 5000) {
    throw ApiError.badRequest(
      'Text claim exceeds maximum limit of 5,000 characters. Please provide a more concise forward or query.',
      'TEXT_TOO_LONG'
    );
  }

  return {
    inputType: SUPPORTED_INPUT_TYPE,
    text: trimmedText
  };
}
