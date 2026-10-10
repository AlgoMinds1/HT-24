/**
 * TruthLens Verification Service
 * Handles claim processing, pipeline orchestration, and contract data delivery.
 * Supports both Mock Fixtures (Demo mode) and Live Backend API (Live AI mode).
 */

import outdatedGovSchemeFixture from '../fixtures/outdated_gov_scheme.json';
import falseHealthClaimFixture from '../fixtures/false_health_claim.json';
import suspiciousKycMessageFixture from '../fixtures/suspicious_kyc_message.json';
import pmVidyalaxmiFixture from '../fixtures/pm_vidyalaxmi_scheme.json';

// Default mock setting based on environment
export const DEFAULT_USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const USE_MOCK = DEFAULT_USE_MOCK;
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const FIXTURE_MAP = {
  outdated_gov: {
    key: 'outdated_gov',
    label: 'Outdated Gov Scheme',
    category: 'Government & Subsidies',
    sampleSnippet: 'PM Free Laptop Scheme 2021 registration link for 10th/12th students...',
    data: outdatedGovSchemeFixture
  },
  pm_vidyalaxmi: {
    key: 'pm_vidyalaxmi',
    label: 'PM-Vidyalaxmi Education Loan',
    category: 'Government & Education (Verified)',
    sampleSnippet: 'Offers collateral-free and guarantor-free education loans for meritorious students...',
    data: pmVidyalaxmiFixture
  },
  false_health: {
    key: 'false_health',
    label: 'False Health Remedy',
    category: 'Medical / Health Advisory',
    sampleSnippet: 'Drinking warm lemon water and baking soda kills 100% of cancer cells...',
    data: falseHealthClaimFixture
  },
  suspicious_kyc: {
    key: 'suspicious_kyc',
    label: 'Suspicious Bank KYC SMS',
    category: 'Financial / Smishing',
    sampleSnippet: 'SBI YONO account blocked. Update Aadhaar/PAN at sbi-kyc-quickupdate.net...',
    data: suspiciousKycMessageFixture
  }
};

export const ANALYSIS_STEPS = [
  { id: 1, title: 'Extracting claim', description: 'Isolating atomic factual statement from unstructured forward.' },
  { id: 2, title: 'Synthesizing knowledge', description: 'Querying Groq reasoning engine and verifying factual plausibility.' },
  { id: 3, title: 'Adversarial stress-test', description: 'Evaluating counter-hypotheses, edge cases, and exploitation risk.' },
  { id: 4, title: 'Finalizing verdict', description: 'Synthesizing confidence score, plain explanation, and safety actions.' }
];

/**
 * Executes the verification flow with step progression callbacks, timeout guardrails, and structured error recovery.
 * 
 * @param {Object} inputPayload - { type: 'text'|'image'|'audio'|'pdf'|'url', content: any, file?: File, presetKey?: string }
 * @param {Function} onStepProgress - Callback receiving step index (0..3)
 * @param {Object} options - { isMockMode?: boolean, timeoutMs?: number }
 * @returns {Promise<Object>} Verdict payload matching contracts/verdict.schema.json
 */
export async function verifyForward(inputPayload, onStepProgress, options = {}) {
  const isMock = options.isMockMode !== undefined ? options.isMockMode : DEFAULT_USE_MOCK;
  const timeoutMs = options.timeoutMs || 60000;

  // ============================================================================
  // MOCK MODE (Deterministic Fixture-driven)
  // ============================================================================
  if (isMock) {
    if (onStepProgress) onStepProgress(0);
    await new Promise((res) => setTimeout(res, 800));

    if (onStepProgress) onStepProgress(1);
    await new Promise((res) => setTimeout(res, 1000));

    if (onStepProgress) onStepProgress(2);
    await new Promise((res) => setTimeout(res, 1000));

    if (onStepProgress) onStepProgress(3);
    await new Promise((res) => setTimeout(res, 700));

    let selectedFixture = FIXTURE_MAP.outdated_gov.data;

    if (inputPayload.presetKey && FIXTURE_MAP[inputPayload.presetKey]) {
      selectedFixture = FIXTURE_MAP[inputPayload.presetKey].data;
    } else if (inputPayload.type === 'text' && typeof inputPayload.content === 'string') {
      const lower = inputPayload.content.toLowerCase();
      if (lower.includes('vidyalaxmi') || lower.includes('education loan') || lower.includes('qhei') || lower.includes('subvention') || lower.includes('guarantor-free') || lower.includes('collateral-free')) {
        selectedFixture = FIXTURE_MAP.pm_vidyalaxmi.data;
      } else if (lower.includes('lemon') || lower.includes('baking soda') || lower.includes('cancer') || lower.includes('health') || lower.includes('remedy')) {
        selectedFixture = FIXTURE_MAP.false_health.data;
      } else if (lower.includes('kyc') || lower.includes('sbi') || lower.includes('yono') || lower.includes('bank') || lower.includes('penalty')) {
        selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
      } else if (lower.includes('laptop') || lower.includes('pmlaptop') || lower.includes('free laptop') || lower.includes('scheme 2021')) {
        selectedFixture = FIXTURE_MAP.outdated_gov.data;
      } else {
        // Unknown custom text query in demo mode: dynamically return UNCONFIRMED for their actual query!
        return buildClientUnconfirmedPayload(inputPayload.content);
      }
    } else if (inputPayload.type === 'url' && typeof inputPayload.content === 'string') {
      const lower = inputPayload.content.toLowerCase();
      if (lower.includes('kyc') || lower.includes('secure') || lower.includes('verify') || lower.includes('account') || lower.includes('sbi') || lower.includes('bank') || lower.includes('yono') || lower.includes('update')) {
        selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
      } else if (lower.includes('vidyalaxmi') || lower.includes('loan') || lower.includes('scholarship')) {
        selectedFixture = FIXTURE_MAP.pm_vidyalaxmi.data;
      } else if (lower.includes('health') || lower.includes('cure') || lower.includes('cancer')) {
        selectedFixture = FIXTURE_MAP.false_health.data;
      } else if (lower.includes('laptop') || lower.includes('scheme')) {
        selectedFixture = FIXTURE_MAP.outdated_gov.data;
      } else {
        return buildClientUnconfirmedPayload(inputPayload.content);
      }
    } else if (inputPayload.type === 'audio') {
      selectedFixture = FIXTURE_MAP.false_health.data;
    } else if (inputPayload.type === 'image' || inputPayload.type === 'pdf') {
      selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
    }

    const resultPayload = JSON.parse(JSON.stringify(selectedFixture));
    resultPayload.mode = 'mock';

    if (inputPayload.type === 'text' && inputPayload.content && !inputPayload.presetKey) {
      resultPayload.input.raw_text = inputPayload.content;
      resultPayload.input.media_type = 'text';
    } else if (inputPayload.type === 'url') {
      resultPayload.input.raw_text = inputPayload.content;
      resultPayload.input.media_type = 'url';
    }

    return resultPayload;
  }

  // ============================================================================
  // LIVE MODE (Backend API POST /api/verify with timeout & retry handling)
  // ============================================================================
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const fetchOptions = {
    method: 'POST',
    signal: controller.signal
  };

  if (inputPayload.type === 'text') {
    const textToVerify = typeof inputPayload.content === 'string' ? inputPayload.content.trim() : '';
    if (!textToVerify || textToVerify.length < 10) {
      clearTimeout(timeoutId);
      const err = new Error('Please provide at least 10 characters of text to verify.');
      err.code = 'TEXT_TOO_SHORT';
      throw err;
    }
    fetchOptions.headers = { 'Content-Type': 'application/json' };
    fetchOptions.body = JSON.stringify({ inputType: 'text', text: textToVerify });

  } else if (inputPayload.type === 'url') {
    const urlToVerify = typeof inputPayload.content === 'string' ? inputPayload.content.trim() : '';
    if (!urlToVerify) {
      clearTimeout(timeoutId);
      const err = new Error('Please provide a valid URL to verify.');
      err.code = 'MISSING_URL';
      throw err;
    }
    fetchOptions.headers = { 'Content-Type': 'application/json' };
    fetchOptions.body = JSON.stringify({ inputType: 'url', url: urlToVerify });

  } else if (inputPayload.type === 'image' || inputPayload.type === 'audio' || inputPayload.type === 'pdf') {
    if (!inputPayload.file) {
      clearTimeout(timeoutId);
      const err = new Error(`Please attach a ${inputPayload.type} file before running verification.`);
      err.code = `MISSING_${inputPayload.type.toUpperCase()}_FILE`;
      throw err;
    }
    const formData = new FormData();
    formData.append('inputType', inputPayload.type);
    formData.append('file', inputPayload.file);
    fetchOptions.body = formData; // Browser automatically populates multipart/form-data boundary
  } else {
    clearTimeout(timeoutId);
    const err = new Error(`Unsupported input type: ${inputPayload.type}`);
    err.code = 'UNSUPPORTED_INPUT_TYPE';
    throw err;
  }

  if (onStepProgress) onStepProgress(0); // Ingesting input & extracting claim

  try {
    const progressTimer1 = setTimeout(() => {
      if (onStepProgress) onStepProgress(1); // Synthesizing knowledge
    }, 1200);

    const progressTimer2 = setTimeout(() => {
      if (onStepProgress) onStepProgress(2); // Adversarial stress-test
    }, 2800);

    const response = await fetch(`${API_BASE_URL}/verify`, fetchOptions);

    clearTimeout(timeoutId);
    clearTimeout(progressTimer1);
    clearTimeout(progressTimer2);

    if (onStepProgress) onStepProgress(3); // Finalizing verdict

    if (!response.ok) {
      let errorMessage = `Verification server returned status ${response.status}`;
      let errorCode = 'SERVER_ERROR';
      let errorWarnings = [];

      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error.message || errorMessage;
          errorCode = errorJson.error.code || errorCode;
          errorWarnings = errorJson.error.warnings || [];
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {}

      if ((response.status === 500 || response.status === 502 || response.status === 503) && (!errorCode || errorCode === 'SERVER_ERROR')) {
        errorMessage = 'TruthLens backend service (port 8000) is stopped. Please run "npm run dev:backend" in your terminal, or switch to Demo Fixtures mode.';
        errorCode = 'BACKEND_OFFLINE';
      }

      const err = new Error(errorMessage);
      err.code = errorCode;
      err.status = response.status;
      err.warnings = errorWarnings;
      err.canRetry = response.status >= 500 || response.status === 429;
      throw err;
    }

    const liveResult = await response.json();
    liveResult.mode = 'live';
    return liveResult;

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Verification timed out after ${Math.round(timeoutMs / 1000)} seconds. The upstream provider or server took too long to respond.`);
      timeoutErr.code = 'TIMEOUT';
      timeoutErr.canRetry = true;
      throw timeoutErr;
    }

    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      const connErr = new Error(
        `Unable to reach TruthLens backend at ${API_BASE_URL}. Ensure the backend service is running on port 8000, or switch to Demo Fixtures mode.`
      );
      connErr.code = 'CONNECTION_FAILED';
      connErr.isConnectionError = true;
      connErr.canRetry = true;
      throw connErr;
    }

    throw err;
  }
}

/**
 * Dynamically constructs an schema-compliant UNCONFIRMED payload for arbitrary custom forwards
 * in Demo Fixtures mode so the application does NOT repeat the canned laptop scheme answer for every query.
 */
export function buildClientUnconfirmedPayload(rawText) {
  const claimText = typeof rawText === 'string' && rawText.trim() ? rawText.trim() : 'Submitted viral forward';
  return {
    input: {
      raw_text: claimText,
      media_type: 'text',
      received_at: new Date().toISOString(),
      source_platform: 'WhatsApp'
    },
    claim: claimText.length > 250 ? claimText.slice(0, 250) + '...' : claimText,
    verdict: 'UNCONFIRMED',
    confidence: {
      score: 0.35,
      rating: 'LOW',
      rationale: 'No authoritative evidence citations were found in the curated knowledge base to substantiate or refute this custom claim.'
    },
    plain_explanation: 'This claim cannot be confirmed based on currently indexed authoritative sources. In Demo Fixtures mode, pre-computed evidence exists for canonical demonstration scenarios. For arbitrary external claims, toggle to Live AI Mode with a connected reasoning engine.',
    evidence: [],
    stress_test: {
      counter_arguments_checked: [
        'Could this claim represent an unindexed recent event or local development?',
        'Are there official gazettes or regulatory clarifications addressing this assertion?'
      ],
      edge_cases_identified: [
        'Claims lacking coverage across reputable gazettes and news repositories frequently represent unverified rumors or emerging viral forwards.'
      ],
      robustness_summary: 'Strict epistemic constraint applied: claims without grounded evidence cannot be validated and remain unconfirmed.'
    },
    truth_timeline: [
      {
        date: new Date().toISOString().split('T')[0],
        event: 'Claim evaluated against curated knowledge base with zero corroboration.',
        significance: 'Absence of verified evidence prevents factual confirmation.'
      }
    ],
    action_risk: {
      risk_level: 'MODERATE',
      risk_category: 'MISINFORMATION',
      warning_flag: 'UNVERIFIED CLAIM: Do not forward or act upon unconfirmed rumors',
      recommended_action: 'Do not forward this message until corroborated by official sources or primary regulatory portals.'
    },
    mode: 'mock'
  };
}
