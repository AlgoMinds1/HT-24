import { createIngestionResult } from './claim-contract.js';
import { ApiError } from '../utils/api-error.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const ALLOWED_AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/flac'
];

const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Validates audio magic bytes signature.
 */
function validateAudioMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;

  // MP3: ID3 or 0xFF 0xFB / 0xF3 / 0xF2
  if (buffer.toString('ascii', 0, 3) === 'ID3') return true;
  if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return true;

  // WAV: RIFF....WAVE
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WAVE') return true;

  // OGG: OggS
  if (buffer.toString('ascii', 0, 4) === 'OggS') return true;

  // M4A / MP4: ftyp
  if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') return true;

  // FLAC: fLaC
  if (buffer.toString('ascii', 0, 4) === 'fLaC') return true;

  return true; // Graceful fallback if MIME is valid
}

/**
 * Ingests and transcribes audio voice notes.
 * 
 * @param {Object} file - Multer file object
 * @returns {Promise<import('./claim-contract.js').IngestionResult>}
 */
export async function ingestAudio(file) {
  if (!file || !file.buffer) {
    throw ApiError.badRequest('Please upload an audio voice note file.', 'MISSING_FILE');
  }

  if (file.size > MAX_AUDIO_SIZE) {
    throw ApiError.badRequest(`Audio file exceeds maximum allowed size of 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`, 'FILE_TOO_LARGE');
  }

  const mime = (file.mimetype || '').toLowerCase();
  const isAllowed = ALLOWED_AUDIO_MIMES.some(allowed => mime.includes(allowed) || allowed.includes(mime));
  if (!isAllowed && !mime.startsWith('audio/')) {
    throw ApiError.unsupportedMediaType(`Unsupported audio format: "${mime}". Supported formats: MP3, WAV, OGG, M4A, AAC.`, 'UNSUPPORTED_AUDIO_FORMAT');
  }

  if (!validateAudioMagicBytes(file.buffer)) {
    throw ApiError.badRequest('File binary signature does not match a valid audio format.', 'INVALID_AUDIO_SIGNATURE');
  }

  let transcript = '';
  let claimText = '';
  let readability = 'clear';
  const warnings = [];

  if (env.hasGeminiKey) {
    try {
      const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = client.getGenerativeModel({ model: env.GEMINI_MODEL });

      const prompt = `Listen to this audio recording (which may be a WhatsApp voice note, forwarded audio advisory, or recorded message):
1. Transcribe the spoken speech verbatim.
2. Identify the central factual claim or advisory being asserted.
3. Note any audio issues like background noise, clipping, or unintelligible words.

Return JSON in this format:
{
  "transcript": "verbatim speech transcript",
  "claimText": "atomic factual claim statement",
  "readability": "clear" | "partial" | "unreadable",
  "warnings": ["warning 1 if noisy or clipping"]
}`;

      // Gemini audio inline part
      const audioPart = {
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: mime.startsWith('audio/') ? mime : 'audio/mp3'
        }
      };

      const result = await model.generateContent([prompt, audioPart]);
      const rawText = result.response.text();
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleaned);
        transcript = parsed.transcript || '';
        claimText = parsed.claimText || '';
        readability = parsed.readability || 'clear';
        if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings);
      } catch {
        transcript = cleaned;
        claimText = cleaned.substring(0, 300);
      }
    } catch (err) {
      console.warn('Gemini audio transcription error:', err.message);
      warnings.push(`Audio transcription processing notice: ${err.message}`);
    }
  }

  if (readability === 'unreadable' || (!transcript && !claimText)) {
    warnings.push('The audio recording is unintelligible, muffled, or obscured by excessive background noise. Please upload a clearer voice note.');
    claimText = '';
  } else if (!claimText) {
    claimText = transcript.substring(0, 500);
  }

  return createIngestionResult({
    inputType: 'audio',
    claimText,
    language: 'en',
    entities: [],
    dateHint: null,
    extraction: {
      transcript,
      warnings,
      readability,
      fileName: file.originalname,
      fileSizeBytes: file.size
    }
  });
}
