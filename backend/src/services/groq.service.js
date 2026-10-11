import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { validateVerdictPayload } from '../validators/verdict.validator.js';
import { extractAssertions } from '../retrieval/assertion_extractor.js';
import { calculateConfidence } from './confidence_engine.js';

const GROQ_CHAT_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_INSTRUCTION = `You are TruthLens Fact-Checking and Verification Intelligence Engine.
You analyze forwarded WhatsApp messages, social media posts, and viral claims to determine factual accuracy, scam risks, and misinformation patterns.

EVIDENCE GROUNDING & VERDICT ACCURACY RULES:
1. You are provided with verified evidence citations retrieved from authoritative knowledge bases and registries.
2. Ground your reasoning, plain explanation, and verdict strictly in the provided evidence.
3. NEVER fabricate, hallucinate, or alter publisher URLs, citations, or quotes.
4. Extract the core atomic factual claim into "claim".
5. Deconstruct the claim into individual factual assertions (e.g., scheme announcement, eligibility scope, benefit amount, deadline, registration channel).
6. Verify these assertions INDIVIDUALLY. Evidence confirming one assertion (such as the existence of a government website or general scholarship portal) DOES NOT automatically verify other assertions (such as a specific ₹50,000 scholarship or universal eligibility).
7. Distinguish source credibility from claim support: An official source (such as PIB or an official gazette) that provides general background or safety guidance does NOT prove that a specific viral claim exists.
8. Allowed verdict values:
   - "SUPPORTED" (ONLY if reliable evidence directly confirms the material assertions of the specific claim)
   - "FALSE" (credible evidence directly contradicts material assertions or an authoritative fact-check confirms it is false)
   - "PARTLY_TRUE" (some material assertions are supported while others are demonstrably false or unconfirmed)
   - "OUTDATED" (information was previously true but has expired, been superseded, or discontinued)
   - "UNCONFIRMED" (evidence is missing, insufficient, indirect, or context-only)
9. IF EVIDENCE IS INDIRECT, INCOMPLETE, OR ONLY PROVIDES GENERAL CONTEXT/PORTAL EXISTENCE, YOU MUST RETURN "UNCONFIRMED". Never return "SUPPORTED" without direct primary corroboration.
10. Confidence evaluation:
    - For UNCONFIRMED claims, confidence score MUST be low (0.20 to 0.35, rating: "LOW").
    - For PARTLY_TRUE, confidence score should be medium (0.50 to 0.65, rating: "MEDIUM").
    - For SUPPORTED or FALSE claims with direct evidence, score should be high (0.85 to 0.95, rating: "HIGH").
11. Stress test: Formulate counter-arguments checked, edge cases identified, and robustness summary explicitly noting which assertions were verified, contradicted, or left unconfirmed.
12. Action risk: Provide realistic user risk level, risk category, and safe actionable guidance.
13. Format response as strictly valid JSON adhering to contracts/verdict.schema.json.`;

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
  const assertions = extractAssertions(claimText);
  const providerSummary = (retrievalMetadata.providers_status || [])
    .map(p => `${p.provider} (${p.status})`)
    .join(', ');

  const confidenceData = calculateConfidence({
    verdict: 'UNCONFIRMED',
    evidence: [],
    assertions
  });

  const assertionChecks = assertions.map(a => 
    `Assertion evaluated: "${a.assertion}" - Direct evidence required: ${a.direct_evidence_required}`
  );

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
      score: confidenceData.score,
      rating: confidenceData.rating,
      rationale: `No direct authoritative records or verified fact-checks were retrieved to substantiate or debunk this claim across active retrieval providers (${providerSummary || 'local KB, search'}).`
    },
    plain_explanation: `This claim could not be confirmed. A thorough search across authoritative databases and fact-checking registries yielded no credible supporting evidence or official announcements confirming these specific assertions. In the absence of corroborating evidence, treat this forward with caution and avoid acting on unverified instructions.`,
    evidence: [],
    stress_test: {
      counter_arguments_checked: assertionChecks.length > 0 ? assertionChecks : [
        'Could this claim be an unverified rumor or recent fabrication not yet indexed by fact-checkers?',
        'Is there any primary gazette or ministry notification substantiating the asserted details?'
      ],
      edge_cases_identified: [
        'Search absence does not prove falsity, but absence of official notifications prevents factual validation.',
        'Viral messages claiming universal grants or immediate deadlines without verifiable government circulars are commonly misleading.'
      ],
      robustness_summary: 'Strict epistemic constraint applied: claims lacking direct grounded evidence cannot be validated as authentic and remain unconfirmed.'
    },
    truth_timeline: [
      {
        date: new Date().toISOString().split('T')[0],
        event: 'Claim evaluated against authoritative knowledge base and registries with zero corroboration.',
        significance: 'Absence of verified evidence prevents factual confirmation.'
      }
    ],
    action_risk: {
      risk_level: 'MODERATE',
      risk_category: 'MISINFORMATION',
      warning_flag: 'UNVERIFIED CLAIM: Do not forward or share personal credentials',
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
 * Strictly distinguishes source credibility from claim support.
 */
export function synthesizeFallbackVerdict(claimText, verifiedEvidence = []) {
  if (!verifiedEvidence || verifiedEvidence.length === 0) {
    return buildUnconfirmedPayload(claimText);
  }

  const assertions = extractAssertions(claimText);

  // Group evidence strictly by classified relationship
  const directSupporting = verifiedEvidence.filter(e => 
    e.claim_relationship === 'SUPPORTS_CLAIM' || e.stance === 'SUPPORTS'
  );
  const directRefuting = verifiedEvidence.filter(e => 
    e.claim_relationship === 'CONTRADICTS_CLAIM' || e.stance === 'REFUTES'
  );
  const contextOnly = verifiedEvidence.filter(e => 
    e.claim_relationship === 'CONTEXT_ONLY' || e.stance === 'CONTEXTUALIZES' || e.stance === 'CONTEXTUAL'
  );

  let verdict = 'UNCONFIRMED';
  let plainExplanation = '';
  let riskLevel = 'MODERATE';
  let riskCategory = 'MISINFORMATION';

  if (directRefuting.length > 0) {
    verdict = 'FALSE';
    plainExplanation = `Authoritative fact-checking sources and official registries refute this claim. ${directRefuting[0].excerpt || ''}`;
    riskLevel = 'HIGH';
    riskCategory = 'MISINFORMATION';
  } else if (directSupporting.length > 0 && directRefuting.length === 0) {
    // Requires direct primary confirmation of the material assertions
    verdict = 'SUPPORTED';
    plainExplanation = `Authoritative government and institutional records confirm this claim. ${directSupporting[0].excerpt || ''}`;
    riskLevel = 'LOW';
    riskCategory = 'BENIGN';
  } else if (contextOnly.length > 0) {
    // Crucial fix: General context or official portal existence DOES NOT establish the specific claim
    verdict = 'UNCONFIRMED';
    const firstContext = contextOnly[0];
    const sourceLabel = firstContext.domain ? `${firstContext.source_name} (${firstContext.domain})` : firstContext.source_name;
    plainExplanation = `This claim could not be confirmed. While official domain records exist for related institutional channels (such as ${sourceLabel}), no official announcement, gazette notification, or authoritative registry confirms the specific asserted scheme details, eligibility criteria, or benefit figures. In the absence of direct corroborating evidence, treat this forward with caution and avoid acting on unverified instructions.`;
    riskLevel = 'MODERATE';
    riskCategory = 'MISINFORMATION';
  } else {
    verdict = 'UNCONFIRMED';
    plainExplanation = `This claim was analyzed against retrieved citations from knowledge base repositories, but insufficient direct evidence exists to verify the specific asserted details.`;
    riskLevel = 'MODERATE';
    riskCategory = 'MISINFORMATION';
  }

  const confidenceData = calculateConfidence({
    verdict,
    evidence: verifiedEvidence,
    assertions
  });

  const assertionChecks = assertions.map(a => 
    `Assertion evaluated: "${a.assertion}" - Direct evidence required: ${a.direct_evidence_required}`
  );

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
      score: confidenceData.score,
      rating: confidenceData.rating,
      rationale: confidenceData.rationale
    },
    plain_explanation: plainExplanation,
    evidence: verifiedEvidence.map(e => ({
      source_name: e.source_name,
      url: e.url,
      published_date: e.published_date || undefined,
      stance: e.stance,
      excerpt: e.excerpt,
      reliability_score: e.reliability_score || 0.85
    })),
    stress_test: {
      counter_arguments_checked: assertionChecks.length > 0 ? assertionChecks : [
        'Could this claim represent an unverified rumor or misinterpretation of official policy?',
        'Are there official gazettes or regulatory clarifications addressing this exact assertion?'
      ],
      edge_cases_identified: [
        directSupporting.length === 0 
          ? 'Existence of legitimate administrative portals does not substantiate specific unverified benefit amounts or viral deadline claims.'
          : 'Official schemes require verified applications through primary domains and do not operate through unaccredited forwards.'
      ],
      robustness_summary: verdict === 'UNCONFIRMED'
        ? 'Strict epistemic constraint enforced: claims with only contextual or indirect evidence cannot be validated as authentic and remain unconfirmed.'
        : 'Evaluated through multi-path epistemic verification pipeline.'
    },
    truth_timeline: [
      {
        date: new Date().toISOString().split('T')[0],
        event: `Evaluated against authoritative records with ${verifiedEvidence.length} retrieved citation(s).`,
        significance: verdict === 'UNCONFIRMED' 
          ? 'Background context located, but direct corroborating evidence is absent.'
          : 'Grounded intelligence determination.'
      }
    ],
    action_risk: {
      risk_level: riskLevel,
      risk_category: riskCategory,
      warning_flag: riskLevel === 'HIGH' 
        ? 'Do not share unverified viral messages or enter personal details on external links.' 
        : (verdict === 'UNCONFIRMED' ? 'UNVERIFIED CLAIM: Verify on official portals before taking action' : null),
      recommended_action: riskLevel === 'HIGH' 
        ? 'Do not forward this message or enter personal details on external links.' 
        : (verdict === 'UNCONFIRMED' ? 'Do not share personal Aadhaar numbers, bank details, or registration fees based on this forward. Check official government domains directly.' : 'Verify all announcements on official government or institutional portals.')
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
 * assertion-level decomposition, and calibrated confidence calculation.
 * 
 * @param {string} textClaim
 * @param {Array<Object>} verifiedEvidence - Verified evidence items from retrieval engine
 * @returns {Promise<Object>} Verified verdict payload conforming to verdict.schema.json
 */
export async function verifyTextWithGroq(textClaim, verifiedEvidence = []) {
  const { verifyClaimWithAI } = await import('./ai_verifier.js');
  return verifyClaimWithAI(textClaim);
}

export async function _originalVerifyTextWithGroq(textClaim, verifiedEvidence = []) {
  if (!env.hasGroqKey) {
    console.warn('[Groq] GROQ_API_KEY is not configured. Falling back to grounded retrieval synthesis.');
    return synthesizeFallbackVerdict(textClaim, verifiedEvidence);
  }

  const assertions = extractAssertions(textClaim);

  const modelsToTry = (env.GROQ_FALLBACK_MODELS && env.GROQ_FALLBACK_MODELS.length > 0)
    ? env.GROQ_FALLBACK_MODELS
    : [env.GROQ_MODEL || 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

  const formattedEvidencePrompt = verifiedEvidence.length > 0
    ? verifiedEvidence.map((e, idx) => `[Evidence Citation ${idx + 1}]
- Source: ${e.source_name}
- URL: ${e.url}
- Date: ${e.published_date || 'N/A'}
- Stance: ${e.stance}
- Relationship to Claim: ${e.claim_relationship || 'CONTEXT_ONLY'}
- Labels: ${(e.labels || []).join(', ')}
- Verified Quote: "${e.excerpt}"
- Reliability: ${e.reliability_score}`).join('\n\n')
    : 'No external evidence citations available.';

  const formattedAssertions = assertions.length > 0
    ? assertions.map((a, i) => `${i + 1}. [${a.type}] "${a.assertion}" (Evidence needed: ${a.direct_evidence_required})`).join('\n')
    : 'None extracted.';

  const basePrompt = `Analyze the following forwarded message or claim:

"""
${textClaim}
"""

EXTRACTED MATERIAL ASSERTIONS TO VERIFY:
${formattedAssertions}

GROUNDED RETRIEVAL CITATIONS:
${formattedEvidencePrompt}

EPISTEMIC VERDICT INSTRUCTIONS:
- Verify each assertion independently.
- If citations only provide general background, cybersecurity advisories, or confirm the existence of a portal (such as scholarships.gov.in) WITHOUT directly confirming the specific asserted scheme details (such as ₹50,000 for every student), you MUST return "UNCONFIRMED" or "PARTLY_TRUE".
- DO NOT return "SUPPORTED" unless direct primary evidence confirms the specific scheme and its material assertions.

Produce a complete structured JSON verdict report matching contracts/verdict.schema.json:
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

      const rawContent1 = await callGroqWithRetry({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: basePrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
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
            reliability_score: e.reliability_score || 0.85
          }));
        }

        // --------------------------------------------------------------------------
        // EPISTEMIC SAFETY GUARDRAIL:
        // If the model claimed SUPPORTED but evidence has ZERO direct supporting items
        // (i.e. only general context or portal existence), downgrade to UNCONFIRMED.
        // --------------------------------------------------------------------------
        const hasDirectSupporting = verifiedEvidence.some(e => 
          e.claim_relationship === 'SUPPORTS_CLAIM' || e.stance === 'SUPPORTS'
        );
        if (parsedPayload.verdict === 'SUPPORTED' && !hasDirectSupporting) {
          console.warn('[Groq Guardrail] Downgrading SUPPORTED to UNCONFIRMED due to absence of direct supporting evidence.');
          parsedPayload.verdict = 'UNCONFIRMED';
          parsedPayload.plain_explanation = `This claim cannot be confirmed. While related administrative portals were retrieved, no authoritative records directly substantiate the specific asserted scheme details or benefit figures.`;
        }

        // Calibrate confidence score mathematically and defensibly
        const calibrated = calculateConfidence({
          verdict: parsedPayload.verdict,
          evidence: verifiedEvidence,
          assertions
        });
        parsedPayload.confidence = {
          score: calibrated.score,
          rating: calibrated.rating,
          rationale: calibrated.rationale
        };

        validationResult = validateVerdictPayload(parsedPayload);
        if (validationResult.valid) {
          return parsedPayload;
        }

        console.warn(`[Groq] ${modelName} Attempt 1 failed schema validation. Retrying once with corrective prompt...`);
      }

      // ATTEMPT 2: Corrective Retry Prompt
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
            reliability_score: e.reliability_score || 0.85
          }));
        }

        // Apply epistemic guardrail and calibrated confidence
        const hasDirectSupporting = verifiedEvidence.some(e => 
          e.claim_relationship === 'SUPPORTS_CLAIM' || e.stance === 'SUPPORTS'
        );
        if (parsedPayload.verdict === 'SUPPORTED' && !hasDirectSupporting) {
          parsedPayload.verdict = 'UNCONFIRMED';
          parsedPayload.plain_explanation = `This claim cannot be confirmed. While related administrative portals were retrieved, no authoritative records directly substantiate the specific asserted scheme details or benefit figures.`;
        }

        const calibrated = calculateConfidence({
          verdict: parsedPayload.verdict,
          evidence: verifiedEvidence,
          assertions
        });
        parsedPayload.confidence = {
          score: calibrated.score,
          rating: calibrated.rating,
          rationale: calibrated.rationale
        };

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

  // Graceful Fallback: synthesize grounded verdict adhering strictly to epistemic constraints
  console.warn(`[Groq] Live API call unavailable (${lastErr?.message || 'Upstream error'}). Falling back to grounded retrieval reasoning engine.`);
  return synthesizeFallbackVerdict(textClaim, verifiedEvidence);
}

// Unified alias for verification
export const verifyClaimWithLLM = verifyTextWithGroq;
