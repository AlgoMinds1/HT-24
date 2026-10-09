/**
 * @file claim-contract.js
 * Unified Claim Contract & Ingestion Result Specification for TruthLens Phase 4.
 */

/**
 * @typedef {'text' | 'image' | 'audio' | 'pdf' | 'url'} IngestInputType
 * @typedef {'clear' | 'partial' | 'unreadable' | 'unknown'} ReadabilityStatus
 * 
 * @typedef {Object} ExtractedClaim
 * @property {string} text - Central atomic factual claim to verify
 * @property {string|null} [language] - Detected natural language (e.g. 'en', 'hi')
 * @property {string[]} [entities] - Relevant named entities, organizations, dates, amounts
 * @property {string|null} [dateHint] - Explicit or inferred temporal reference relevant to the claim
 * 
 * @typedef {Object} ExtractionMetadata
 * @property {string} [extractedText] - Raw text extracted via OCR or PDF
 * @property {string} [transcript] - Transcribed speech from audio note
 * @property {string[]} [warnings] - Qualitative caveats regarding quality, compression, or ambiguity
 * @property {ReadabilityStatus} [readability] - Content legibility or audio clarity
 * @property {string} [sourceUrl] - Original web article URL if applicable
 * @property {string} [fileName] - Original uploaded filename if applicable
 * @property {number} [fileSizeBytes] - File size in bytes
 * 
 * @typedef {Object} IngestionResult
 * @property {IngestInputType} inputType - The format received
 * @property {ExtractedClaim} claim - The normalized factual claim
 * @property {ExtractionMetadata} extraction - Metadata and extraction artifacts
 */

/**
 * Creates and validates a standardized IngestionResult object.
 * 
 * @param {Object} params
 * @param {IngestInputType} params.inputType
 * @param {string} params.claimText
 * @param {string|null} [params.language]
 * @param {string[]} [params.entities]
 * @param {string|null} [params.dateHint]
 * @param {Object} [params.extraction]
 * @returns {IngestionResult}
 */
export function createIngestionResult({
  inputType,
  claimText,
  language = null,
  entities = [],
  dateHint = null,
  extraction = {}
}) {
  const safeClaim = (claimText || '').trim();
  const safeWarnings = Array.isArray(extraction.warnings) 
    ? extraction.warnings.filter(w => typeof w === 'string' && w.trim()) 
    : [];

  const safeEntities = Array.isArray(entities)
    ? entities.filter(e => typeof e === 'string' && e.trim())
    : [];

  return {
    inputType: inputType || 'text',
    claim: {
      text: safeClaim,
      language: language ? String(language).trim() : null,
      entities: safeEntities,
      dateHint: dateHint ? String(dateHint).trim() : null
    },
    extraction: {
      extractedText: extraction.extractedText ? extraction.extractedText.trim() : undefined,
      transcript: extraction.transcript ? extraction.transcript.trim() : undefined,
      warnings: safeWarnings,
      readability: extraction.readability || 'clear',
      sourceUrl: extraction.sourceUrl ? extraction.sourceUrl.trim() : undefined,
      fileName: extraction.fileName ? extraction.fileName.trim() : undefined,
      fileSizeBytes: typeof extraction.fileSizeBytes === 'number' ? extraction.fileSizeBytes : undefined
    }
  };
}
