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

GROUNDED RETRIEVAL & EVIDENCE INSTRUCTIONS:
1. You are provided with verified evidence citations retrieved from authoritative knowledge bases and fact-check registries.
2. Ground your reasoning, plain explanation, and verdict strictly in the provided evidence.
3. NEVER fabricate, hallucinate, or alter publisher URLs, citations, or quotes.
4. Extract the core atomic factual claim being evaluated into "claim".
5. Allowed verdict values:
   - "SUPPORTED" (claim is backed by credible authoritative sources)
   - "FALSE" (claim is fabricated, scientifically debunked, or a known scam)
   - "OUTDATED" (information was true in the past but has expired or been superseded)
   - "PARTLY_TRUE" (mix of accurate facts and misleading exaggerations)
   - "UNCONFIRMED" (insufficient reliable evidence exists to confirm or refute)
6. Provide a realistic confidence evaluation (score: 0.0 to 1.0, rating: "HIGH"|"MEDIUM"|"LOW", rationale: string).
7. Formulate stress-test counter-arguments, edge cases, and robustness summary.
8. Provide an action-risk assessment identifying user risk level, risk category, and safe actionable guidance.
9. Format response as strictly valid JSON adhering to contracts/verdict.schema.json.`;

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
 * Retries a Gemini API call if a transient 503 or 429 occurs.
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
 * Constructs a standardized, schema-compliant UNCONFIRMED verdict payload
 * when no grounded evidence can be retrieved to substantiate or debunk a claim.
 */
export function buildUnconfirmedPayload(claimText, retrievalMetadata = {}) {
  const providerSummary = (retrievalMetadata.providers_status || [])
    .map(p => `${p.provider} (${p.status})`)
    .join(', ');

  const payload = {
    input: {
      raw_text: claimText,
      media_type: 'text',
      received_at: new Date().toISOString(),
      source_platform: 'Web Forward'
    },
    claim: claimText.length > 300 ? claimText.slice(0, 300) : claimText,
    verdict: 'UNCONFIRMED',
    confidence: {
      score: 0.35,
      rating: 'LOW',
      rationale: `No authoritative sources, official gazettes, or verified fact-checks were retrieved to substantiate or debunk this claim across active retrieval providers (${providerSummary || 'local KB, search'}).`
    },
    plain_explanation: `This claim could not be confirmed. A thorough search across authoritative databases and fact-checking registries yielded no credible supporting evidence or official verification. In the absence of corroborating evidence, treat this forward with caution and avoid sharing it.`,
    evidence: [],
    stress_test: {
      counter_arguments_checked: [
        'Could this claim be too new to have official debunks or press coverage?',
        'Is there any primary source or government portal substantiating the asserted details?'
      ],
      edge_cases_identified: [
        'Claims lacking coverage across reputable news archives and government repositories frequently represent unverified rumors or emerging misinformation.'
      ],
      robustness_summary: 'Strict epistemic constraint applied: claims without grounded evidence cannot be validated as true or false and remain unconfirmed.'
    },
    truth_timeline: [
      {
        date: new Date().toISOString().split('T')[0],
        event: 'Claim evaluated against authoritative knowledge base and retrieval providers with zero corroboration.',
        significance: 'Absence of verified evidence prevents factual confirmation.'
      }
    ],
    action_risk: {
      risk_level: 'MODERATE',
      risk_category: 'MISINFORMATION',
      warning_flag: 'UNVERIFIED CLAIM: Do not forward or take financial/medical action',
      recommended_action: 'Do not circulate this message. Wait for official statements from verified organizations or government authorities before acting on its contents.'
    }
  };

  const validation = validateVerdictPayload(payload);
  if (!validation.valid) {
    console.error('Unconfirmed payload failed schema validation:', validation.errors);
  }
  return payload;
}

/**
 * Verifies a text claim using Gemini with structured JSON output, Ajv validation,
 * and grounded evidence citations.
 * 
 * @param {string} textClaim
 * @param {Array<Object>} verifiedEvidence - Verified evidence items from retrieval engine
 * @returns {Promise<Object>} Verified verdict payload conforming to verdict.schema.json
 */
export async function verifyTextWithGemini(textClaim, verifiedEvidence = []) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  const formattedEvidencePrompt = verifiedEvidence.length > 0
    ? verifiedEvidence.map((e, idx) => `[Evidence Citation ${idx + 1}]
- Source: ${e.source_name}
- URL: ${e.url}
- Date: ${e.published_date || 'N/A'}
- Stance: ${e.stance}
- Verified Quote: "${e.excerpt}"
- Reliability: ${e.reliability_score}`).join('\n\n')
    : 'No external evidence citations available.';

  const basePrompt = `Analyze the following forwarded message or claim:

"""
${textClaim}
"""

GROUNDED RETRIEVAL CITATIONS:
${formattedEvidencePrompt}

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
  "truth_timeline": [
    { "date": "YYYY-MM-DD", "event": "Historical or factual event", "significance": "Impact on claim" }
  ],
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
      if (!parsedPayload.input) {
        parsedPayload.input = {
          raw_text: textClaim,
          media_type: 'text',
          received_at: new Date().toISOString(),
          source_platform: 'Web Forward'
        };
      }

      // Strictly map verified evidence items to ensure zero hallucination
      if (verifiedEvidence.length > 0) {
        parsedPayload.evidence = verifiedEvidence.map(e => ({
          source_name: e.source_name,
          url: e.url,
          published_date: e.published_date || undefined,
          stance: e.stance,
          excerpt: e.excerpt,
          reliability_score: e.reliability_score
        }));
      } else {
        parsedPayload.evidence = [];
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

      if (verifiedEvidence.length > 0) {
        parsedPayload.evidence = verifiedEvidence.map(e => ({
          source_name: e.source_name,
          url: e.url,
          published_date: e.published_date || undefined,
          stance: e.stance,
          excerpt: e.excerpt,
          reliability_score: e.reliability_score
        }));
      } else {
        parsedPayload.evidence = [];
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

    if (err.status === 400 || err.message?.includes('API_KEY_INVALID') || err.message?.includes('API key not valid') || err.message?.includes('key')) {
      throw ApiError.badRequest('Invalid Gemini API Key configured on backend. Please provide a valid API key from Google AI Studio (starting with AIzaSy...).', 'INVALID_API_KEY');
    }
    if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
      throw ApiError.badRequest('Gemini API rate limit exceeded. Please try again shortly.', 'RATE_LIMITED');
    }

    console.error('Gemini Service Error:', err.message);
    throw ApiError.upstreamError(
      `Gemini reasoning service failed: ${err.message || 'Unknown upstream provider error'}`
    );
  }
}
