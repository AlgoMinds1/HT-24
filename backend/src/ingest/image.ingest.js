import { createIngestionResult } from './claim-contract.js';
import { ApiError } from '../utils/api-error.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { extractExif, analyzeExifSignals } from '../utils/exif.parser.js';
import { fetchFactChecks } from '../services/live_news_retriever.js';

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
  let visionEngineUsed = null;
  const warnings = [];

  // ── Step 2A: EXIF Metadata Analysis (zero-cost, runs in parallel with OCR) ──
  let exifData = null;
  let exifAnalysis = null;
  try {
    exifData = extractExif(file.buffer);
    exifAnalysis = analyzeExifSignals(exifData);
    if (exifAnalysis.warnings.length > 0) {
      warnings.push(...exifAnalysis.warnings);
    }
    console.log(`[Image Ingest] EXIF: hasExif=${exifAnalysis.hasExif}, manipulationRisk=${exifAnalysis.manipulationRisk}, signals=${exifAnalysis.signals.length}`);
  } catch (exifErr) {
    console.warn('[Image Ingest] EXIF extraction skipped:', exifErr.message);
  }

  if (env.hasGroqKey) {
    const visionModels = (env.GROQ_VISION_FALLBACK_MODELS && env.GROQ_VISION_FALLBACK_MODELS.length > 0)
      ? env.GROQ_VISION_FALLBACK_MODELS
      : [env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b', 'qwen/qwen3.8-27b'];

    const exifContext = exifAnalysis
      ? `\n\nEXIF METADATA ANALYSIS (pre-extracted):\n${exifAnalysis.summary}\nManipulation Risk: ${exifAnalysis.manipulationRisk}\n${exifAnalysis.signals.map(s => `- ${s.type}: ${JSON.stringify(s.value)} [Risk: ${s.risk}]`).join('\n')}`
      : '';

    const prompt = `Analyze this image (which may be a screenshot of a forwarded message, social media post, or graphic):
1. Extract any visible text completely via OCR (prioritize message bubbles and headlines over background UI chrome).
2. Identify the central factual claim being made.
3. Note if the image is blurry, cropped, low-resolution, or partially legible.
4. If EXIF metadata shows editing software or date mismatches, factor this into your assessment.${exifContext}

Return JSON in this format:
{
  "extractedText": "full OCR text found in image",
  "claimText": "atomic factual claim statement",
  "readability": "clear" | "partial" | "unreadable",
  "warnings": ["warning 1 if blurry or cropped or EXIF mismatch"]
}`;

    const base64Data = file.buffer.toString('base64');
    let ocrSucceeded = false;

    for (const modelName of visionModels) {
      if (ocrSucceeded) break;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mime};base64,${base64Data}`
                      }
                    }
                  ]
                }
              ],
              response_format: { type: 'json_object' },
              temperature: 0.1
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            const isTransient = res.status === 429 || res.status >= 500;
            if (isTransient && attempt < 2) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            throw new Error(`Groq Vision error ${res.status}: ${errText}`);
          }

          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();

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
          ocrSucceeded = true;
          visionEngineUsed = `Groq Vision (${modelName})`;
          break;
        } catch (err) {
          console.warn(`[Groq Vision] Model ${modelName} attempt ${attempt} encountered error:`, err.message);
          if (attempt >= 2) break;
        }
      }
    }

    if (!ocrSucceeded && !env.hasGeminiKey) {
      warnings.push('Multimodal OCR service could not process this image due to provider rate limits. Please re-upload a clear image or enter the claim directly.');
    }
  }

  if (!extractedText && !claimText && env.hasGeminiKey) {
    const modelsToTry = (env.GEMINI_FALLBACK_MODELS && env.GEMINI_FALLBACK_MODELS.length > 0)
      ? env.GEMINI_FALLBACK_MODELS
      : [env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-3.8-flash'];

    const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const exifContextGemini = exifAnalysis
      ? `\n\nEXIF METADATA ANALYSIS (pre-extracted):\n${exifAnalysis.summary}\nManipulation Risk: ${exifAnalysis.manipulationRisk}\n${exifAnalysis.signals.map(s => `- ${s.type}: ${JSON.stringify(s.value)} [Risk: ${s.risk}]`).join('\n')}`
      : '';

    const prompt = `Analyze this image (which may be a screenshot of a forwarded message, social media post, or graphic):
1. Extract any visible text completely via OCR (prioritize message bubbles and headlines over background UI chrome).
2. Identify the central factual claim being made.
3. Note if the image is blurry, cropped, low-resolution, or partially legible.
4. If EXIF metadata shows editing software or date mismatches, factor this into your assessment.${exifContextGemini}

Return JSON in this format:
{
  "extractedText": "full OCR text found in image",
  "claimText": "atomic factual claim statement",
  "readability": "clear" | "partial" | "unreadable",
  "warnings": ["warning 1 if blurry or cropped or EXIF mismatch"]
}`;

    const imagePart = {
      inlineData: {
        data: file.buffer.toString('base64'),
        mimeType: mime
      }
    };

    let ocrSucceeded = false;

    for (const modelName of modelsToTry) {
      if (ocrSucceeded) break;
      try {
        const model = client.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json'
          }
        });

        // Try model with transient retry
        let result = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            result = await model.generateContent([prompt, imagePart]);
            break;
          } catch (callErr) {
            const isTransient = callErr.status === 503 || callErr.status === 429 || 
              callErr.message?.includes('503') || callErr.message?.includes('429') ||
              callErr.message?.includes('quota') || callErr.message?.includes('high demand');
            if (isTransient && attempt < 2) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            throw callErr;
          }
        }

        if (result && result.response) {
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
          ocrSucceeded = true;
          visionEngineUsed = `Gemini Vision (${modelName})`;
          break;
        }
      } catch (err) {
        console.warn(`[Gemini Vision] Model ${modelName} encountered error:`, err.message);
      }
    }

    if (!ocrSucceeded) {
      warnings.push('Multimodal OCR service could not process this image due to provider rate limits. Please re-upload a clear image or enter the claim directly.');
    }
  }

  if (readability === 'unreadable' || (!extractedText && !claimText)) {
    warnings.push('The uploaded image does not contain legible text or a distinct verifiable claim. Please provide a clear, higher-resolution screenshot or image.');
    claimText = '';
  } else if (!claimText) {
    claimText = extractedText.substring(0, 500);
  }

  // ── Step 3: External Evidence Cross-Check (Google Fact Check Tools API) ──
  let factCheckResults = [];
  if (claimText && claimText.length >= 5) {
    try {
      factCheckResults = await fetchFactChecks(claimText);
      console.log(`[Image Ingest] Step 3: Retrieved ${factCheckResults.length} fact-checks for image claim: "${claimText.slice(0, 60)}..."`);
    } catch (fcErr) {
      console.warn('[Image Ingest] Step 3 Fact check fetch skipped:', fcErr.message);
    }
  }

  // ── Step 4: Evidence Fusion (2A Metadata Analysis + 2B Visual Analysis + Step 3 Fact Checks) ──
  const metadataFields = exifAnalysis?.metadataFields || null;
  const manipulationRisk = exifAnalysis?.manipulationRisk || 'UNKNOWN';

  const evidenceFusion = {
    // 2A Metadata Analysis signals
    metadataAnalysis: {
      hasExif: Boolean(exifAnalysis?.hasExif),
      manipulationRisk,
      fields: metadataFields,
      summary: exifAnalysis?.summary || 'No EXIF metadata available.'
    },
    // 2B Visual Analysis signals
    visualAnalysis: {
      engine: visionEngineUsed || 'none',
      readability,
      extractedTextLength: extractedText.length,
      hasExtractedClaim: Boolean(claimText),
      ocrWarnings: warnings.filter(w => !w.toLowerCase().includes('exif') && !w.toLowerCase().includes('software'))
    },
    // Step 3 Cross-check results
    factCheckCrossCheck: {
      totalFound: factCheckResults.length,
      topMatches: factCheckResults.slice(0, 3).map(fc => ({
        source: fc.source_name,
        title: fc.title,
        stance: fc.stance,
        url: fc.url
      }))
    },
    // Consolidated fusion assessment
    fusionSummary: [
      exifAnalysis?.summary ? `[2A Metadata] ${exifAnalysis.summary} (Risk: ${manipulationRisk})` : '[2A Metadata] Stripped / No EXIF (Common in viral forwards)',
      visionEngineUsed ? `[2B Visual OCR] Extracted via ${visionEngineUsed}` : '[2B Visual OCR] OCR unavailable',
      factCheckResults.length > 0 
        ? `[3 Fact-Check Cross-Check] Corroborated by ${factCheckResults.length} certified debunks/articles (${factCheckResults.map(f => f.source_name).slice(0, 2).join(', ')})`
        : '[3 Fact-Check Cross-Check] No prior certified debunks in fact-check registry'
    ].join(' | ')
  };

  // Extract dateHint from EXIF capture date for the claim contract
  const dateHintFromExif = exifData?.dateTimeOriginal
    ? exifData.dateTimeOriginal.substring(0, 10).replace(/:/g, '-')
    : null;

  return createIngestionResult({
    inputType: 'image',
    claimText,
    language: 'en',
    entities: [],
    dateHint: dateHintFromExif,
    extraction: {
      extractedText,
      warnings,
      readability,
      fileName: file.originalname,
      fileSizeBytes: file.size,
      // EXIF metadata and signal analysis
      exif: exifData || undefined,
      exifAnalysis: exifAnalysis
        ? {
            hasExif:          exifAnalysis.hasExif,
            manipulationRisk: exifAnalysis.manipulationRisk,
            summary:          exifAnalysis.summary,
            signals:          exifAnalysis.signals,
            metadataFields:   exifAnalysis.metadataFields || null,
            captureDate:      exifData?.dateTimeOriginal || null,
            device:           (exifData?.make && exifData?.model) ? `${exifData.make} ${exifData.model}` : null,
            software:         exifData?.software || null,
            gps:              exifData?.gps || null,
            orientation:      exifData?.orientation || null,
            dimensions:       (exifData?.imageWidth && exifData?.imageHeight)
                                ? { width: exifData.imageWidth, height: exifData.imageHeight }
                                : null
          }
        : { hasExif: false, manipulationRisk: 'UNKNOWN', summary: 'No EXIF data available.' },
      factCheckResults,
      evidenceFusion
    }
  });
}
