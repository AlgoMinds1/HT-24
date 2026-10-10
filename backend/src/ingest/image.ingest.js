import { createIngestionResult } from './claim-contract.js';
import { ApiError } from '../utils/api-error.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates binary buffer magic bytes against common image signatures.
 */
function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;

  // GIF: GIF8
  if (buffer.toString('ascii', 0, 4).startsWith('GIF8')) return true;

  // WEBP: RIFF....WEBP
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return true;

  return false;
}

/**
 * Ingests and processes an uploaded image buffer.
 * 
 * @param {Object} file - Multer file object
 * @returns {Promise<import('./claim-contract.js').IngestionResult>}
 */
export async function ingestImage(file) {
  if (!file || !file.buffer) {
    throw ApiError.badRequest('Please upload an image file.', 'MISSING_FILE');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw ApiError.badRequest(`Image exceeds maximum allowed size of 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`, 'FILE_TOO_LARGE');
  }

  const mime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw ApiError.unsupportedMediaType(`Unsupported image format: "${mime}". Supported formats: JPEG, PNG, WebP, GIF.`, 'UNSUPPORTED_IMAGE_FORMAT');
  }

  if (!validateImageMagicBytes(file.buffer)) {
    throw ApiError.badRequest('File binary signature does not match a valid image format.', 'INVALID_IMAGE_SIGNATURE');
  }

  let extractedText = '';
  let claimText = '';
  let readability = 'clear';
  const warnings = [];

  if (env.hasGeminiKey) {
    try {
      const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = client.getGenerativeModel({ 
        model: env.GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const prompt = `Analyze this image (which may be a screenshot of a forwarded message, social media post, or graphic):
1. Extract any visible text completely via OCR (prioritize message bubbles and headlines over background UI chrome).
2. Identify the central factual claim being made.
3. Note if the image is blurry, cropped, low-resolution, or partially legible.

Return JSON in this format:
{
  "extractedText": "full OCR text found in image",
  "claimText": "atomic factual claim statement",
  "readability": "clear" | "partial" | "unreadable",
  "warnings": ["warning 1 if blurry or cropped"]
}`;

      const imagePart = {
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: mime
        }
      };

      // Call Gemini vision with transient retry
      let result = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          result = await model.generateContent([prompt, imagePart]);
          break;
        } catch (callErr) {
          const isTransient = callErr.status === 503 || callErr.status === 429 || callErr.message?.includes('503') || callErr.message?.includes('high demand');
          if (isTransient && attempt < 3) {
            console.warn(`[Gemini Vision] Transient error (${callErr.message}). Retrying in 1500ms...`);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          throw callErr;
        }
      }

      const rawText = result.response.text();
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleaned);
        extractedText = parsed.extractedText || '';
        claimText = parsed.claimText || '';
        readability = parsed.readability || 'clear';
        if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings);
      } catch {
        extractedText = cleaned;
        claimText = cleaned.substring(0, 300);
      }
    } catch (err) {
      console.warn('Gemini vision OCR error:', err.message);
      warnings.push(`Image OCR processing notice: ${err.message}`);
    }
  }

  if (readability === 'unreadable' || (!extractedText && !claimText)) {
    warnings.push('The uploaded image does not contain legible text or a distinct verifiable claim. Please provide a clear, higher-resolution screenshot or image.');
    claimText = '';
  } else if (!claimText) {
    claimText = extractedText.substring(0, 500);
  }

  return createIngestionResult({
    inputType: 'image',
    claimText,
    language: 'en',
    entities: [],
    dateHint: null,
    extraction: {
      extractedText,
      warnings,
      readability,
      fileName: file.originalname,
      fileSizeBytes: file.size
    }
  });
}
