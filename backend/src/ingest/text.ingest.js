import { createIngestionResult } from './claim-contract.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Ingests and normalizes raw text input.
 * 
 * @param {string} text
 * @returns {Promise<import('./claim-contract.js').IngestionResult>}
 */
export async function ingestText(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw ApiError.badRequest('Please provide a non-empty text claim.', 'MISSING_TEXT');
  }

  const trimmed = text.trim();

  if (trimmed.length < 10) {
    throw ApiError.badRequest('Text is too short. Please provide at least 10 characters.', 'TEXT_TOO_SHORT');
  }

  if (trimmed.length > 5000) {
    throw ApiError.badRequest('Text exceeds the maximum length of 5,000 characters.', 'TEXT_TOO_LONG');
  }

  const warnings = [];
  if (trimmed.length > 3000) {
    warnings.push('Long message detected: analyzing central claim extracted from content.');
  }

  // Quick entity and date heuristic detection
  const entities = [];
  const dateHintMatch = trimmed.match(/\b(202[0-9]|2030|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:202[0-9])?)\b/i);
  const dateHint = dateHintMatch ? dateHintMatch[0] : null;

  return createIngestionResult({
    inputType: 'text',
    claimText: trimmed,
    language: 'en',
    entities,
    dateHint,
    extraction: {
      warnings,
      readability: 'clear'
    }
  });
}
