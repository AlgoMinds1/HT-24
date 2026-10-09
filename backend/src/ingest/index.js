import { ingestText } from './text.ingest.js';
import { ingestImage } from './image.ingest.js';
import { ingestAudio } from './audio.ingest.js';
import { ingestPdf } from './pdf.ingest.js';
import { ingestUrl } from './url.ingest.js';
import { ApiError } from '../utils/api-error.js';

export * from './claim-contract.js';

/**
 * Unified Ingestion Dispatcher
 * Routes any of the five supported input formats to its respective handler
 * and returns a standardized IngestionResult conforming to the Unified Claim Contract.
 * 
 * @param {Object} params
 * @param {'text' | 'image' | 'audio' | 'pdf' | 'url'} params.inputType
 * @param {string} [params.text] - For text claims
 * @param {string} [params.url] - For URL claims
 * @param {Object} [params.file] - For image, audio, or PDF uploads (Multer file object)
 * @returns {Promise<import('./claim-contract.js').IngestionResult>}
 */
export async function ingestInput({ inputType, text, url, file }) {
  const type = (inputType || 'text').toString().toLowerCase().trim();

  switch (type) {
    case 'text':
      return await ingestText(text);

    case 'url':
      return await ingestUrl(url || text);

    case 'image':
      if (!file) throw ApiError.badRequest('Please upload an image file.', 'MISSING_IMAGE_FILE');
      return await ingestImage(file);

    case 'audio':
      if (!file) throw ApiError.badRequest('Please upload an audio voice note file.', 'MISSING_AUDIO_FILE');
      return await ingestAudio(file);

    case 'pdf':
      if (!file) throw ApiError.badRequest('Please upload a PDF document.', 'MISSING_PDF_FILE');
      return await ingestPdf(file);

    default:
      throw ApiError.unsupportedMediaType(
        `Unsupported input type: "${type}". Allowed formats: text, image, audio, pdf, url.`,
        'UNSUPPORTED_INPUT_TYPE'
      );
  }
}
