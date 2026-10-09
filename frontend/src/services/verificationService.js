/**
 * TruthLens Verification Service
 * Handles claim processing, pipeline orchestration, and contract data delivery.
 */

import outdatedGovSchemeFixture from '../fixtures/outdated_gov_scheme.json';
import falseHealthClaimFixture from '../fixtures/false_health_claim.json';
import suspiciousKycMessageFixture from '../fixtures/suspicious_kyc_message.json';

// In Phase 1, USE_MOCK is enabled by default
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

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
  { id: 2, title: 'Searching sources', description: 'Querying authoritative fact repositories, official gazettes, and domains.' },
  { id: 3, title: 'Cross-checking evidence', description: 'Assessing stance, credibility weights, and adversarial nuances.' },
  { id: 4, title: 'Preparing verdict', description: 'Synthesizing confidence score, plain explanation, and risk advisories.' }
];

/**
 * Executes the verification flow with step progression callbacks.
 * 
 * @param {Object} inputPayload - { type: 'text'|'image'|'audio'|'pdf'|'url', content: any, presetKey?: string }
 * @param {Function} onStepProgress - Callback receiving step index (0..3)
 * @returns {Promise<Object>} Verdict payload matching verdict.schema.json
 */
export async function verifyForward(inputPayload, onStepProgress) {
  if (USE_MOCK) {
    // Step 1: Extracting claim
    if (onStepProgress) onStepProgress(0);
    await new Promise((res) => setTimeout(res, 900));

    // Step 2: Searching sources
    if (onStepProgress) onStepProgress(1);
    await new Promise((res) => setTimeout(res, 1100));

    // Step 3: Cross-checking evidence
    if (onStepProgress) onStepProgress(2);
    await new Promise((res) => setTimeout(res, 1200));

    // Step 4: Preparing verdict
    if (onStepProgress) onStepProgress(3);
    await new Promise((res) => setTimeout(res, 800));

    // Determine which fixture payload to return based on explicit preset or text heuristics
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

    // Clone and optionally attach the user's actual input if text
    const resultPayload = JSON.parse(JSON.stringify(selectedFixture));
    if (inputPayload.type === 'text' && inputPayload.content && !inputPayload.presetKey) {
      resultPayload.input.raw_text = inputPayload.content;
      resultPayload.input.media_type = 'text';
    } else if (inputPayload.type === 'url') {
      resultPayload.input.raw_text = inputPayload.content;
      resultPayload.input.media_type = 'url';
    }

    return resultPayload;
  }

  // Future Phase: Real Backend API call (e.g., fetch('/api/verify', { method: 'POST', body: ... }))
  throw new Error('Live verification backend is not connected yet. Set USE_MOCK=true.');
}
