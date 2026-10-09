import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { validateVerdictPayload } from '../validators/verdict.validator.js';

let genAIClient = null;

function getClient() {
  if (!genAIClient) {
    if (!env.hasGeminiKey) {
      throw ApiError.serviceUnavailable(
        'Gemini API key is not configured on the backend. Please provide GEMINI_API_KEY in backend/.env.',
        'MISSING_GEMINI_API_KEY'
      );
    }
    genAIClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAIClient;
}

const SYSTEM_INSTRUCTION = `You are TruthLens Fact-Checking and Verification Intelligence Engine.
You analyze forwarded WhatsApp messages, social media posts, and viral claims to determine factual accuracy, scam risks, and misinformation patterns.

IMPORTANT ARCHITECTURAL CONSTRAINTS FOR THIS LIVE PHASE:
1. Live web-search retrieval (RAG) is not yet active in this phase.
2. DO NOT fabricate, hallucinate, or invent sources, news articles, publisher URLs, or citations.
   Keep "evidence": [] (an empty array).
3. Extract the core atomic factual claim being evaluated into "claim".
4. Determine the verdict based on verified common knowledge and rigorous reasoning.
   Allowed verdict values:
   - "SUPPORTED" (claim is definitively true and backed by established facts)
   - "FALSE" (claim is fabricated, scientifically debunked, or a known scam)
   - "OUTDATED" (information was true in the past but has expired or been superseded)
   - "PARTLY_TRUE" (mix of accurate facts and misleading exaggerations)
   - "UNCONFIRMED" (insufficient information exists to conclusively confirm or debunk)
5. Provide a realistic confidence evaluation (score: 0.0 to 1.0, rating: "HIGH"|"MEDIUM"|"LOW", rationale: string).
6. Formulate stress-test counter-arguments, edge cases, and robustness summary.
7. Provide an action-risk assessment identifying what the message asks the recipient to do, exploitation severity, and safe guidance.
8. Truth timeline may be empty [] or contain verifiable historical development milestones.
9. Format response as strictly valid JSON adhering to the standardized schema.`;

/**
 * Strips markdown code blocks if the model wrapped output in ```json ... ```
 */
function cleanJsonText(rawText) {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Retries a Gemini API call if a transient 503 (high demand) or 429 occurs.
 */
async function callGeminiWithRetry(fn, retries = 3, delayMs = 1500) {
  let currentDelay = delayMs;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isTransient = 
        err.status === 503 || 
        err.status === 429 || 
        err.message?.includes('503') || 
        err.message?.includes('high demand') ||
        err.message?.includes('Resource exhausted') ||
        err.message?.includes('RESOURCE_EXHAUSTED');

      if (isTransient && attempt < retries) {
        console.warn(`[Gemini] Transient error (${err.message}). Retrying in ${currentDelay}ms... (attempt ${attempt}/${retries})`);
        await new Promise(res => setTimeout(res, currentDelay));
        currentDelay = Math.round(currentDelay * 1.5);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Verifies a text claim using Gemini with structured JSON output and Ajv validation.
 * Includes exactly 1 self-correcting retry if validation fails.
 * 
 * @param {string} textClaim
 * @returns {Promise<Object>} Verified verdict payload conforming to verdict.schema.json
 */
export async function verifyTextWithGemini(textClaim) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  const basePrompt = `Analyze the following forwarded message or claim:

"""
${textClaim}
"""

Produce a complete structured JSON verdict report matching this structure:
{
  "input": {
    "raw_text": "${textClaim.replace(/"/g, '\\"')}",
    "media_type": "text",
    "received_at": "${new Date().toISOString()}",
    "source_platform": "Web Forward"
  },
  "claim": "Atomic extracted claim statement",
  "verdict": "SUPPORTED" | "FALSE" | "OUTDATED" | "PARTLY_TRUE" | "UNCONFIRMED",
  "confidence": {
    "score": 0.0 to 1.0,
    "rating": "HIGH" | "MEDIUM" | "LOW",
    "rationale": "Reason for confidence"
  },
  "plain_explanation": "Concise plain-English assessment explaining the determination",
  "evidence": [],
  "stress_test": {
    "counter_arguments_checked": ["Counter-argument 1", "Counter-argument 2"],
    "edge_cases_identified": ["Edge case or nuance 1"],
    "robustness_summary": "Robustness summary"
  },
  "truth_timeline": [],
  "action_risk": {
    "risk_level": "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "SAFE",
    "risk_category": "FINANCIAL_FRAUD" | "HEALTH_HAZARD" | "MISINFORMATION" | "PHISHING" | "CIVIC_CONFUSION" | "BENIGN",
    "warning_flag": "Headline alert banner",
    "recommended_action": "Safe actionable steps for the recipient"
  }
}`;

  let parsedPayload = null;
  let validationResult = null;

  try {
    // --------------------------------------------------------------------------
    // ATTEMPT 1: Primary Gemini Generation
    // --------------------------------------------------------------------------
    const response1 = await callGeminiWithRetry(() => model.generateContent(basePrompt));
    const responseText1 = response1.response.text();
    const cleanedText1 = cleanJsonText(responseText1);

    try {
      parsedPayload = JSON.parse(cleanedText1);
    } catch (parseErr) {
      console.warn('Gemini Attempt 1 output could not be parsed as JSON:', parseErr.message);
    }

    if (parsedPayload) {
      // Ensure input block is always attached safely
      if (!parsedPayload.input) {
        parsedPayload.input = {
          raw_text: textClaim,
          media_type: 'text',
          received_at: new Date().toISOString(),
          source_platform: 'Web Forward'
        };
      }
      validationResult = validateVerdictPayload(parsedPayload);
    }

    // --------------------------------------------------------------------------
    // ATTEMPT 2 (RETRY): If Attempt 1 failed schema validation or parsing
    // --------------------------------------------------------------------------
    if (!parsedPayload || !validationResult?.valid) {
      const errorFeedback = validationResult?.errors 
        ? JSON.stringify(validationResult.errors, null, 2)
        : 'Output was not valid JSON.';

      console.warn('Attempt 1 failed schema validation. Retrying once with corrective prompt...');

      const retryPrompt = `${basePrompt}

CRITICAL CORRECTION INSTRUCTION:
Your previous output failed JSON Schema validation with the following errors:
${errorFeedback}

Please strictly rectify these errors and return pure JSON that passes contracts/verdict.schema.json without any surrounding text.`;

      const response2 = await callGeminiWithRetry(() => model.generateContent(retryPrompt));
      const responseText2 = response2.response.text();
      const cleanedText2 = cleanJsonText(responseText2);

      parsedPayload = JSON.parse(cleanedText2);
      if (!parsedPayload.input) {
        parsedPayload.input = {
          raw_text: textClaim,
          media_type: 'text',
          received_at: new Date().toISOString(),
          source_platform: 'Web Forward'
        };
      }
      validationResult = validateVerdictPayload(parsedPayload);

      if (!validationResult.valid) {
        console.error('Gemini Attempt 2 also failed schema validation:', validationResult.errors);
        throw ApiError.upstreamError(
          'Model output failed schema validation requirements after self-correction retry.',
          'INVALID_MODEL_OUTPUT',
          validationResult.errors
        );
      }
    }

    return parsedPayload;

  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Handle Gemini SDK specific error statuses
    if (err.status === 400 || err.message?.includes('API_KEY_INVALID')) {
      throw ApiError.badRequest('Invalid Gemini API Key configured on backend.', 'INVALID_API_KEY');
    }
    if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return ApiError.badRequest('Gemini API rate limit exceeded. Please try again shortly.', 'RATE_LIMITED');
    }

    console.error('Gemini Service Error:', err.message);
    throw ApiError.upstreamError(
      `Gemini reasoning service failed: ${err.message || 'Unknown upstream provider error'}`
    );
  }
}
