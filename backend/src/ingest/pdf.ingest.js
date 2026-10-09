import { createIngestionResult } from './claim-contract.js';
import { ApiError } from '../utils/api-error.js';
import pdfParse from 'pdf-parse';

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PAGES = 20;
const MAX_CHARS = 25000;

/**
 * Validates PDF header magic bytes (%PDF-).
 */
function validatePdfMagicBytes(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.toString('ascii', 0, 5) === '%PDF-';
}

/**
 * Ingests and extracts text from an uploaded PDF document.
 * 
 * @param {Object} file - Multer file object
 * @returns {Promise<import('./claim-contract.js').IngestionResult>}
 */
export async function ingestPdf(file) {
  if (!file || !file.buffer) {
    throw ApiError.badRequest('Please upload a PDF document file.', 'MISSING_FILE');
  }

  if (file.size > MAX_PDF_SIZE) {
    throw ApiError.badRequest(`PDF exceeds maximum allowed size of 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`, 'FILE_TOO_LARGE');
  }

  const mime = (file.mimetype || '').toLowerCase();
  if (mime !== 'application/pdf' && !file.originalname?.toLowerCase().endsWith('.pdf')) {
    throw ApiError.unsupportedMediaType(`Unsupported format: "${mime}". Please upload a valid PDF document.`, 'UNSUPPORTED_PDF_FORMAT');
  }

  if (!validatePdfMagicBytes(file.buffer)) {
    throw ApiError.badRequest('File binary signature does not match a valid PDF document (%PDF- missing).', 'INVALID_PDF_SIGNATURE');
  }

  let pdfData = null;
  const warnings = [];

  try {
    // Normalize buffer to explicit Uint8Array byte slice for pdf.js compatibility in Node.js 26+
    const normalizedBuffer = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
    pdfData = await pdfParse(normalizedBuffer, {
      max: MAX_PAGES
    });
  } catch (err) {
    console.error('pdf-parse error:', err.message);
    throw ApiError.badRequest(`Failed to parse PDF document: ${err.message}`, 'PDF_PARSE_ERROR');
  }

  let rawExtractedText = (pdfData.text || '').replace(/\r\n/g, '\n').trim();

  if (pdfData.numpages > MAX_PAGES) {
    warnings.push(`Document has ${pdfData.numpages} pages; analysis limited to first ${MAX_PAGES} pages.`);
  }

  let readability = 'clear';

  // Detect scanned / image-only PDFs
  const words = rawExtractedText.split(/\s+/).filter(Boolean);
  if (words.length < 25 && file.size > 50 * 1024) {
    readability = 'partial';
    warnings.push('This PDF appears to be a scanned document or image without selectable text. Only minimal text was extractable.');
  }

  if (rawExtractedText.length > MAX_CHARS) {
    rawExtractedText = rawExtractedText.substring(0, MAX_CHARS);
    warnings.push(`Extracted text truncated to ${MAX_CHARS.toLocaleString()} characters for analysis.`);
  }

  let claimText = '';
  if (rawExtractedText.length >= 10) {
    // Isolate first meaningful announcement / headline or first 300 characters
    const firstParagraph = rawExtractedText.split('\n\n').find(p => p.trim().length > 20) || rawExtractedText;
    claimText = firstParagraph.trim().substring(0, 400);
  } else {
    claimText = `Document (${file.originalname || 'document.pdf'}) submitted for circular authenticity check.`;
  }

  return createIngestionResult({
    inputType: 'pdf',
    claimText,
    language: 'en',
    entities: [],
    dateHint: null,
    extraction: {
      extractedText: rawExtractedText,
      warnings,
      readability,
      fileName: file.originalname,
      fileSizeBytes: file.size
    }
  });
}
