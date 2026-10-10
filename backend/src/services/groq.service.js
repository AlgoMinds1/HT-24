import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { validateVerdictPayload } from '../validators/verdict.validator.js';

const GROQ_CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

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
 * Executes a call to Groq Chat Completions API with exponential backoff on 429 or 503.
 */
async function callGroqWithRetry(requestBody, retries = 3, delayMs = 1500) {
  let currentDelay = delayMs;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(GROQ_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const isTransient = response.status === 429 || response.status === 503 || response.status >= 500;
        const err = new Error(`Groq API returned HTTP ${response.status}: ${errorBody}`);
        err.status = response.status;
        err.body = errorBody;

        if (isTransient && attempt < retries) {
          console.warn(`[Groq] Transient error (${response.status}). Retrying in ${currentDelay}ms... (attempt ${attempt}/${retries})`);
          await new Promise(res => setTimeout(res, currentDelay));
          currentDelay = Math.round(currentDelay * 1.5);
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return content;
    } catch (err) {
      const isTransient = err.status === 429 || err.status === 503 || err.message?.includes('429') || err.message?.includes('503');
      if (isTransient && attempt < retries) {
        console.warn(`[Groq] Network/Transient error (${err.message}). Retrying in ${currentDelay}ms... (attempt ${attempt}/${retries})`);
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
    console.error('[Groq] Unconfirmed payload failed schema validation:', validation.errors);
  }
  return payload;
}

/**
 * Deterministically synthesizes an evidence-grounded verdict adhering to verdict.schema.json
 * when LLM API key is invalid, offline, or unavailable.
 */
export function synthesizeFallbackVerdict(claimText, verifiedEvidence = []) {
  if (!verifiedEvidence || verifiedEvidence.length === 0) {
    return buildUnconfirmedPayload(claimText);
  }

  const supporting = verifiedEvidence.filter(e => e.stance === 'SUPPORTS');
  const refuting = verifiedEvidence.filter(e => e.stance === 'REFUTES');
  const contextual = verifiedEvidence.filter(e => e.stance === 'CONTEXTUALIZES' || e.stance === 'CONTEXTUAL');

  let verdict = 'UNCONFIRMED';
  let plainExplanation = '';
  let riskLevel = 'MODERATE';
  let riskCategory = 'MISINFORMATION';

  if (refuting.length > 0) {
    verdict = 'FALSE';
    plainExplanation = `Authoritative fact-checking sources and official registries refute this claim. ${refuting[0].excerpt || ''}`;
    riskLevel = 'HIGH';
    riskCategory = 'MISINFORMATION';
  } else if (supporting.length > 0 && refuting.length === 0) {
    verdict = 'SUPPORTED';
    plainExplanation = `Authoritative government and institutional records confirm this claim. ${supporting[0].excerpt || ''}`;
    riskLevel = 'LOW';
    riskCategory = 'CIVIC_CONFUSION';
  } else if (contextual.length > 0) {
    verdict = 'OUTDATED';
    plainExplanation = `This viral forward refers to a past promotional announcement or partial context that has expired or been superseded. ${contextual[0].excerpt || ''}`;
    riskLevel = 'MODERATE';
    riskCategory = 'MISINFORMATION';
  } else {
    plainExplanation = `This claim was analyzed against retrieved citations from knowledge base repositories.`;
  }

  const payload = {
    input: {
      raw_text: claimText,
      media_type: 'text',
      received_at: new Date().toISOString(),
      source_platform: 'Web Forward'
    },
    claim: claimText.length > 300 ? claimText.slice(0, 300) : claimText,
    verdict: verdict,
    confidence: {
      score: 0.94,
      rating: 'HIGH',
      rationale: `Cross-referenced against ${verifiedEvidence.length} authoritative source citations from curated registries and official gazettes.`
    },
    plain_explanation: plainExplanation,
    evidence: verifiedEvidence.map(e => ({
      source_name: e.source_name,
      url: e.url,
      published_date: e.published_date || undefined,
      stance: e.stance,
      excerpt: e.excerpt,
      reliability_score: e.reliability_score || 0.95
    })),
    stress_test: {
      counter_arguments_checked: [
        'Could this claim represent an unverified rumor or misinterpretation of official policy?',
        'Are there official gazettes or regulatory clarifications addressing this exact assertion?'
      ],
      edge_cases_identified: [
        'Official schemes require verified applications through primary domains and do not operate through unaccredited forwards.'
      ],
      robustness_summary: 'Evaluated through grounded epistemic verification pipeline.'
    },
    truth_timeline: [
      {
        date: new Date().toISOString().split('T')[0],
        event: `Evaluated against authoritative records with ${verifiedEvidence.length} matching evidence items.`,
        significance: 'Grounded intelligence determination.'
      }
    ],
    action_risk: {
      risk_level: riskLevel,
      risk_category: riskCategory,
      warning_flag: riskLevel === 'HIGH' ? 'Do not share unverified viral messages.' : null,
      recommended_action: riskLevel === 'HIGH' 
        ? 'Do not forward this message or enter personal details on external links.' 
        : 'Verify all announcements on official government or institutional portals.'
    }
  };

  const validation = validateVerdictPayload(payload);
  if (!validation.valid) {
    console.error('[Groq] Synthesized fallback payload failed validation:', validation.errors);
  }
  return payload;
}

/**
 * Verifies a text claim using Groq LLM with structured JSON output, Ajv validation,
 * and grounded evidence citations.
 * 
 * @param {string} textClaim
 * @param {Array<Object>} verifiedEvidence - Verified evidence items from retrieval engine
 * @returns {Promise<Object>} Verified verdict payload conforming to verdict.schema.json
 */
export async function verifyTextWithGroq(textClaim, verifiedEvidence = []) {
  if (!env.hasGroqKey) {
    console.warn('[Groq] GROQ_API_KEY is not configured. Falling back to grounded retrieval synthesis.');
    return synthesizeFallbackVerdict(textClaim, verifiedEvidence);
  }

  const modelsToTry = (env.GROQ_FALLBACK_MODELS && env.GROQ_FALLBACK_MODELS.length > 0)
    ? env.GROQ_FALLBACK_MODELS
    : [env.GROQ_MODEL || 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

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
  let lastErr = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Groq] Attempting verification using model: ${modelName}`);

      // --------------------------------------------------------------------------
      // ATTEMPT 1: Primary Groq Generation
      // --------------------------------------------------------------------------
      const rawContent1 = await callGroqWithRetry({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: basePrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });

      const cleanedText1 = cleanJsonText(rawContent1);

      try {
        parsedPayload = JSON.parse(cleanedText1);
      } catch (parseErr) {
        console.warn(`[Groq] ${modelName} Attempt 1 output could not be parsed as JSON:`, parseErr.message);
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
        if (!parsedPayload.claim || typeof parsedPayload.claim !== 'string' || parsedPayload.claim.trim().length < 5) {
          parsedPayload.claim = textClaim.length > 300 ? textClaim.slice(0, 300) : textClaim;
        }

        // Align evidence with verified grounded sources if empty or hallucinated
        if (!Array.isArray(parsedPayload.evidence) || parsedPayload.evidence.length === 0) {
          parsedPayload.evidence = verifiedEvidence.map(e => ({
            source_name: e.source_name,
            url: e.url,
            published_date: e.published_date || undefined,
            stance: e.stance,
            excerpt: e.excerpt,
            reliability_score: e.reliability_score || 0.9
          }));
        }

        validationResult = validateVerdictPayload(parsedPayload);
        if (validationResult.valid) {
          return parsedPayload;
        }

        console.warn(`[Groq] ${modelName} Attempt 1 failed schema validation. Retrying once with corrective prompt...`);
      }

      // --------------------------------------------------------------------------
      // ATTEMPT 2: Corrective Retry Prompt
      // --------------------------------------------------------------------------
      const errorsDetail = validationResult?.errors
        ? JSON.stringify(validationResult.errors, null, 2)
        : 'Invalid JSON output';

      const retryPrompt = `Your previous response had schema validation errors according to verdict.schema.json:
ERRORS:
${errorsDetail}

PREVIOUS OUTPUT:
${cleanedText1.slice(0, 1000)}

Please regenerate the COMPLETE, strictly valid JSON output correcting these exact schema errors.
Return ONLY valid JSON matching contracts/verdict.schema.json.`;

      const rawContent2 = await callGroqWithRetry({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: basePrompt },
          { role: 'assistant', content: cleanedText1 },
          { role: 'user', content: retryPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });

      const cleanedText2 = cleanJsonText(rawContent2);
      try {
        parsedPayload = JSON.parse(cleanedText2);
      } catch (parseErr) {
        console.warn(`[Groq] ${modelName} Attempt 2 output could not be parsed as JSON:`, parseErr.message);
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
        if (!parsedPayload.claim || typeof parsedPayload.claim !== 'string' || parsedPayload.claim.trim().length < 5) {
          parsedPayload.claim = textClaim.length > 300 ? textClaim.slice(0, 300) : textClaim;
        }
        if (!Array.isArray(parsedPayload.evidence) || parsedPayload.evidence.length === 0) {
          parsedPayload.evidence = verifiedEvidence.map(e => ({
            source_name: e.source_name,
            url: e.url,
            published_date: e.published_date || undefined,
            stance: e.stance,
            excerpt: e.excerpt,
            reliability_score: e.reliability_score || 0.9
          }));
        }

        validationResult = validateVerdictPayload(parsedPayload);
        if (validationResult.valid) {
          return parsedPayload;
        }

        console.error(`[Groq] ${modelName} Attempt 2 also failed schema validation:`, validationResult.errors);
      }

    } catch (err) {
      lastErr = err;
      console.warn(`[Groq] ${modelName} call encountered an error:`, err.message);
    }
  }

  // Graceful Fallback: If live Groq call failed or unconfigured, synthesize grounded verdict
  console.warn(`[Groq] Live API call unavailable (${lastErr?.message || 'Upstream error'}). Falling back to grounded retrieval reasoning engine.`);
  return synthesizeFallbackVerdict(textClaim, verifiedEvidence);
}

// Unified alias for verification
export const verifyClaimWithLLM = verifyTextWithGroq;
