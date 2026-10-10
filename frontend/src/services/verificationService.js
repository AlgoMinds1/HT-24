/**
 * TruthLens Verification Service
 * Handles claim processing, pipeline orchestration, and contract data delivery.
 * Supports both Mock Fixtures (USE_MOCK=true) and Live Backend API (USE_MOCK=false).
 */

import outdatedGovSchemeFixture from '../fixtures/outdated_gov_scheme.json';
import falseHealthClaimFixture from '../fixtures/false_health_claim.json';
import suspiciousKycMessageFixture from '../fixtures/suspicious_kyc_message.json';

// In Phase 1 and 2, USE_MOCK is true by default
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const FIXTURE_MAP = {
  outdated_gov: {
    key: 'outdated_gov',
    label: 'Outdated Gov Scheme',
    category: 'Government & Subsidies',
    sampleSnippet: 'PM Free Laptop Scheme 2021 registration link for 10th/12th students...',
    data: outdatedGovSchemeFixture
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
  { id: 2, title: 'Synthesizing knowledge', description: 'Querying Gemini reasoning engine and verifying factual plausibility.' },
  { id: 3, title: 'Adversarial stress-test', description: 'Evaluating counter-hypotheses, edge cases, and exploitation risk.' },
  { id: 4, title: 'Finalizing verdict', description: 'Synthesizing confidence score, plain explanation, and safety actions.' }
];

/**
 * Executes the verification flow with step progression callbacks.
 * 
 * @param {Object} inputPayload - { type: 'text'|'image'|'audio'|'pdf'|'url', content: any, presetKey?: string }
 * @param {Function} onStepProgress - Callback receiving step index (0..3)
 * @returns {Promise<Object>} Verdict payload matching verdict.schema.json
 */
export async function verifyForward(inputPayload, onStepProgress) {
  // ============================================================================
  // MOCK MODE (Fixture-driven)
  // ============================================================================
  if (USE_MOCK) {
    if (onStepProgress) onStepProgress(0);
    await new Promise((res) => setTimeout(res, 900));

    if (onStepProgress) onStepProgress(1);
    await new Promise((res) => setTimeout(res, 1100));

    if (onStepProgress) onStepProgress(2);
    await new Promise((res) => setTimeout(res, 1200));

    if (onStepProgress) onStepProgress(3);
    await new Promise((res) => setTimeout(res, 800));

    let selectedFixture = FIXTURE_MAP.outdated_gov.data;

    if (inputPayload.presetKey && FIXTURE_MAP[inputPayload.presetKey]) {
      selectedFixture = FIXTURE_MAP[inputPayload.presetKey].data;
    } else if (inputPayload.type === 'text' && typeof inputPayload.content === 'string') {
      const lower = inputPayload.content.toLowerCase();
      if (lower.includes('lemon') || lower.includes('baking soda') || lower.includes('cancer') || lower.includes('health')) {
        selectedFixture = FIXTURE_MAP.false_health.data;
      } else if (lower.includes('kyc') || lower.includes('sbi') || lower.includes('yono') || lower.includes('bank') || lower.includes('penalty')) {
        selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
      } else {
        selectedFixture = FIXTURE_MAP.outdated_gov.data;
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
  // LIVE MODE (Backend API POST /api/verify)
  // ============================================================================
  let fetchOptions = {
    method: 'POST'
  };

  if (inputPayload.type === 'text') {
    const textToVerify = typeof inputPayload.content === 'string' ? inputPayload.content.trim() : '';
    if (!textToVerify || textToVerify.length < 10) {
      throw new Error('Please provide at least 10 characters of text to verify.');
    }
    fetchOptions.headers = { 'Content-Type': 'application/json' };
    fetchOptions.body = JSON.stringify({ inputType: 'text', text: textToVerify });

  } else if (inputPayload.type === 'url') {
    const urlToVerify = typeof inputPayload.content === 'string' ? inputPayload.content.trim() : '';
    if (!urlToVerify) {
      throw new Error('Please provide a valid URL to verify.');
    }
    fetchOptions.headers = { 'Content-Type': 'application/json' };
    fetchOptions.body = JSON.stringify({ inputType: 'url', url: urlToVerify });

  } else if (inputPayload.type === 'image' || inputPayload.type === 'audio' || inputPayload.type === 'pdf') {
    if (!inputPayload.file) {
      throw new Error(`Please attach a ${inputPayload.type} file before running verification.`);
    }
    const formData = new FormData();
    formData.append('inputType', inputPayload.type);
    formData.append('file', inputPayload.file);
    fetchOptions.body = formData; // Browser automatically populates multipart/form-data boundary
  } else {
    throw new Error(`Unsupported input type: ${inputPayload.type}`);
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

    clearTimeout(progressTimer1);
    clearTimeout(progressTimer2);

    if (onStepProgress) onStepProgress(3); // Finalizing verdict

    if (!response.ok) {
      let errorMessage = `Verification server returned error status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {}
      throw new Error(errorMessage);
    }

    const liveResult = await response.json();
    liveResult.mode = 'live';
    return liveResult;

  } catch (err) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      throw new Error(
        `Unable to reach TruthLens backend (${API_BASE_URL}). Please verify that the backend server is running on port 8000, or set VITE_USE_MOCK=true in frontend/.env to test in demo fixture mode.`
      );
    }
    throw err;
  }
}
