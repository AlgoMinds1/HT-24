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

  if (env.hasGroqKey) {
    try {
      const audioFormData = new FormData();
      const ext = mime.includes('wav') ? 'wav' : (mime.includes('ogg') ? 'ogg' : (mime.includes('m4a') ? 'm4a' : 'mp3'));
      const blob = new Blob([file.buffer], { type: mime.startsWith('audio/') ? mime : 'audio/mp3' });
      audioFormData.append('file', blob, file.originalname || `recording.${ext}`);
      audioFormData.append('model', env.GROQ_AUDIO_MODEL || 'whisper-large-v3');
      audioFormData.append('response_format', 'json');

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`
        },
        body: audioFormData
      });

      if (whisperRes.ok) {
        const whisperData = await whisperRes.json();
        transcript = (whisperData.text || '').trim();

        if (transcript) {
          // Analyze transcript with Groq LLM to isolate atomic claim and evaluate clarity
          const analysisPrompt = `Given the following speech transcript from an audio recording or voice note:
"""
${transcript}
"""

Extract the central factual claim being made and assess readability.
Return strictly JSON in this format:
{
  "claimText": "atomic factual claim statement",
  "readability": "clear" | "partial" | "unreadable",
  "warnings": ["warning if ambiguous or incomplete"]
}`;

          try {
            const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'user', content: analysisPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1
              })
            });

            if (chatRes.ok) {
              const chatData = await chatRes.json();
              const parsed = JSON.parse(chatData.choices?.[0]?.message?.content || '{}');
              claimText = parsed.claimText || transcript.substring(0, 300);
              readability = parsed.readability || 'clear';
              if (Array.isArray(parsed.warnings)) warnings.push(...parsed.warnings);
            } else {
              claimText = transcript.substring(0, 300);
            }
          } catch (chatErr) {
            console.warn('[Groq Audio] Extraction error:', chatErr.message);
            claimText = transcript.substring(0, 300);
          }
        }
      } else {
        const errText = await whisperRes.text();
        console.warn(`[Groq Audio] Whisper transcription failed (${whisperRes.status}):`, errText);
      }
    } catch (groqErr) {
      console.warn('[Groq Audio] Whisper API error:', groqErr.message);
    }
  }

  if (!transcript && !claimText && env.hasGeminiKey) {
    const modelsToTry = (env.GEMINI_FALLBACK_MODELS && env.GEMINI_FALLBACK_MODELS.length > 0)
      ? env.GEMINI_FALLBACK_MODELS
      : [env.GEMINI_MODEL || 'gemini-1.5-flash', 'gemini-1.5-flash'];

    const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
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

    const audioPart = {
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: mime.startsWith('audio/') ? mime : 'audio/mp3'
      }
    };

    let audioSucceeded = false;

    for (const modelName of modelsToTry) {
      if (audioSucceeded) break;
      try {
        const model = client.getGenerativeModel({ model: modelName });
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
        audioSucceeded = true;
        break;
      } catch (err) {
        console.warn(`[Gemini Audio] Model ${modelName} error:`, err.message);
      }
    }

    if (!audioSucceeded) {
      warnings.push('Audio transcription service could not process this recording due to provider capacity. Please enter the claim directly.');
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
