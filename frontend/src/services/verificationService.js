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
  { id: 2, title: 'AI Verification', description: 'Cross-referencing claim using Groq & Gemini against official government portals.' },
  { id: 3, title: 'Adversarial stress-test', description: 'Evaluating counter-hypotheses, edge cases, and exploitation risk.' },
  { id: 4, title: 'Finalizing verdict', description: 'Synthesizing confidence score, plain explanation, and official source links.' }
];

/**
 * Aborts an active verification session on the backend.
 * 
 * @param {string} verificationId - ID of the active session
 * @returns {Promise<boolean>}
 */
export async function abortVerification(verificationId) {
  if (!verificationId) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/verify/abort/${verificationId}`, {
      method: 'POST'
    });
    return res.ok;
  } catch (err) {
    console.warn('[verificationService] Abort request failed:', err);
    return false;
  }
}

/**
 * Executes the verification flow with real-time SSE stream reading,
 * fine-grained event callbacks, timeout guardrails, and mock fallback.
 * 
 * @param {Object} inputPayload - { type: 'text'|'image'|'audio'|'pdf'|'url', content: any, file?: File, presetKey?: string }
 * @param {Function} onEvent - Callback receiving each real-time investigation event object
 * @param {Object} options - { isMockMode?: boolean, timeoutMs?: number, abortController?: AbortController }
 * @returns {Promise<Object>} Verdict payload matching contracts/verdict.schema.json
 */
export async function verifyForward(inputPayload, onEvent, options = {}) {
  const isMock = options.isMockMode !== undefined ? options.isMockMode : DEFAULT_USE_MOCK;
  const timeoutMs = options.timeoutMs || 90000;
  const externalController = options.abortController;

  const emitEvent = (ev) => {
    if (typeof onEvent === 'function') {
      try {
        onEvent(ev);
      } catch (e) {
        console.warn('[verificationService] Error in onEvent callback:', e);
      }
    }
  };

  // ============================================================================
  // MOCK MODE (Deterministic Fixture-driven with realistic animated steps)
  // ============================================================================
  if (isMock) {
    const mockId = `mock_${Math.random().toString(36).slice(2, 9)}`;

    emitEvent({
      agent: 'system',
      eventType: 'verification_started',
      status: 'in_progress',
      verificationId: mockId,
      message: `Verification session initialized for input type: ${inputPayload.type}`
    });
    await new Promise((res) => setTimeout(res, 500));

    let selectedFixture = FIXTURE_MAP.outdated_gov.data;
    if (inputPayload.presetKey && FIXTURE_MAP[inputPayload.presetKey]) {
      selectedFixture = FIXTURE_MAP[inputPayload.presetKey].data;
    } else if (inputPayload.type === 'text' && typeof inputPayload.content === 'string') {
      const lower = inputPayload.content.toLowerCase();
      if (lower.includes('vidyalaxmi') || lower.includes('education loan') || lower.includes('qhei')) {
        selectedFixture = FIXTURE_MAP.pm_vidyalaxmi.data;
      } else if (lower.includes('lemon') || lower.includes('baking soda') || lower.includes('cancer')) {
        selectedFixture = FIXTURE_MAP.false_health.data;
      } else if (lower.includes('kyc') || lower.includes('sbi') || lower.includes('yono')) {
        selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
      } else if (lower.includes('laptop') || lower.includes('scheme 2021')) {
        selectedFixture = FIXTURE_MAP.outdated_gov.data;
      } else {
        selectedFixture = buildClientUnconfirmedPayload(inputPayload.content);
      }
    } else if (inputPayload.type === 'url' && typeof inputPayload.content === 'string') {
      const lower = inputPayload.content.toLowerCase();
      if (lower.includes('kyc') || lower.includes('sbi')) {
        selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
      } else if (lower.includes('vidyalaxmi')) {
        selectedFixture = FIXTURE_MAP.pm_vidyalaxmi.data;
      } else {
        selectedFixture = buildClientUnconfirmedPayload(inputPayload.content);
      }
    } else if (inputPayload.type === 'audio') {
      selectedFixture = FIXTURE_MAP.false_health.data;
    } else if (inputPayload.type === 'image' || inputPayload.type === 'pdf') {
      selectedFixture = FIXTURE_MAP.suspicious_kyc.data;
    }

    const claimText = selectedFixture.claim || 'Submitted factual statement';

    emitEvent({
      agent: 'system',
      eventType: 'claim_extracted',
      status: 'completed',
      data: { claimText, language: 'en', entities: [] },
      message: `Extracted normalized factual claim: "${claimText}"`
    });
    await new Promise((res) => setTimeout(res, 600));

    // Agent 1 search started
    emitEvent({
      agent: 'web_research',
      eventType: 'search_started',
      status: 'in_progress',
      query: claimText,
      provider: 'Google News RSS / Real-time Web Search',
      message: `Agent 1 searching authoritative sources for: "${claimText}"`
    });

    // Agent 2 query started
    emitEvent({
      agent: 'fact_check',
      eventType: 'fact_check_started',
      status: 'in_progress',
      query: claimText,
      provider: 'Google Fact Check Tools API',
      message: `Agent 2 querying Google Fact Check database for: "${claimText}"`
    });
    await new Promise((res) => setTimeout(res, 700));

    // Mock evidence extraction
    const mockEvidence = Array.isArray(selectedFixture.evidence) ? selectedFixture.evidence : [];
    
    if (mockEvidence.length > 0) {
      const firstEv = mockEvidence[0];
      emitEvent({
        agent: 'web_research',
        eventType: 'url_selected',
        status: 'in_progress',
        url: firstEv.url || 'https://factcheck.pib.gov.in',
        title: firstEv.source_name || 'Official Portal',
        domain: new URL(firstEv.url || 'https://factcheck.pib.gov.in').hostname,
        message: `Inspecting candidate source: ${firstEv.source_name}`
      });

      await new Promise((res) => setTimeout(res, 500));

      emitEvent({
        agent: 'web_research',
        eventType: 'page_fetch_completed',
        status: 'completed',
        url: firstEv.url || 'https://factcheck.pib.gov.in',
        title: firstEv.source_name || 'Official Portal',
        domain: new URL(firstEv.url || 'https://factcheck.pib.gov.in').hostname,
        excerpt: firstEv.excerpt,
        message: `Successfully inspected: ${firstEv.source_name}`
      });

      emitEvent({
        agent: 'web_research',
        eventType: 'evidence_extracted',
        status: 'completed',
        url: firstEv.url,
        title: firstEv.source_name,
        domain: new URL(firstEv.url || 'https://factcheck.pib.gov.in').hostname,
        excerpt: firstEv.excerpt,
        stance: firstEv.stance || 'CONTEXTUALIZES',
        message: `Extracted verified evidence from ${firstEv.source_name}`
      });
    }

    await new Promise((res) => setTimeout(res, 600));

    // Agent 2 findings
    if (selectedFixture.verdict === 'FALSE') {
      emitEvent({
        agent: 'fact_check',
        eventType: 'fact_check_matches',
        status: 'completed',
        data: {
          matchCount: 1,
          records: [{
            publisher: 'PIB Fact Check',
            title: claimText,
            rating: 'Fake / Misleading',
            stance: 'REFUTES',
            url: 'https://factcheck.pib.gov.in'
          }]
        },
        message: 'Agent 2 found 1 matching certified fact-check record.'
      });
    } else {
      emitEvent({
        agent: 'fact_check',
        eventType: 'fact_check_empty',
        status: 'empty',
        message: 'No conflicting records in Google Fact Check database.'
      });
    }

    await new Promise((res) => setTimeout(res, 700));

    emitEvent({
      agent: 'synthesis',
      eventType: 'evidence_comparison_completed',
      status: 'completed',
      data: {
        totalEvidenceItems: mockEvidence.length,
        fromAgent1Count: 1,
        fromAgent2Count: selectedFixture.verdict === 'FALSE' ? 1 : 0
      },
      message: `Evidence synthesized: ${mockEvidence.length} distinct sources cross-referenced.`
    });

    await new Promise((res) => setTimeout(res, 600));

    const resultPayload = JSON.parse(JSON.stringify(selectedFixture));
    resultPayload.mode = 'mock';
    resultPayload.verificationId = mockId;

    emitEvent({
      agent: 'synthesis',
      eventType: 'verification_completed',
      status: 'completed',
      data: resultPayload,
      message: `Verification complete: [${resultPayload.verdict}] Determination established.`
    });

    return resultPayload;
  }

  // ============================================================================
  // LIVE MODE (Real SSE Stream from Backend POST /api/verify?stream=true)
  // ============================================================================
  const controller = externalController || new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const fetchOptions = {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Accept': 'text/event-stream'
    }
  };

  if (inputPayload.type === 'text') {
    const textToVerify = typeof inputPayload.content === 'string' ? inputPayload.content.trim() : '';
    if (!textToVerify || textToVerify.length < 10) {
      clearTimeout(timeoutId);
      const err = new Error('Please provide at least 10 characters of text to verify.');
      err.code = 'TEXT_TOO_SHORT';
      throw err;
    }
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify({ inputType: 'text', text: textToVerify });

  } else if (inputPayload.type === 'url') {
    const urlToVerify = typeof inputPayload.content === 'string' ? inputPayload.content.trim() : '';
    if (!urlToVerify) {
      clearTimeout(timeoutId);
      const err = new Error('Please provide a valid URL to verify.');
      err.code = 'MISSING_URL';
      throw err;
    }
    fetchOptions.headers['Content-Type'] = 'application/json';
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
    fetchOptions.body = formData;
  } else {
    clearTimeout(timeoutId);
    const err = new Error(`Unsupported input type: ${inputPayload.type}`);
    err.code = 'UNSUPPORTED_INPUT_TYPE';
    throw err;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/verify?stream=true`, fetchOptions);

    if (!response.ok) {
      clearTimeout(timeoutId);
      let errorMessage = `Verification server returned status ${response.status}`;
      let errorCode = 'SERVER_ERROR';
      try {
        const errorJson = await response.json();
        if (errorJson.error?.message) errorMessage = errorJson.error.message;
        if (errorJson.error?.code) errorCode = errorJson.error.code;
      } catch {}

      const err = new Error(errorMessage);
      err.code = errorCode;
      err.status = response.status;
      throw err;
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If server responded with standard JSON instead of stream
    if (contentType.includes('application/json')) {
      clearTimeout(timeoutId);
      const liveResult = await response.json();
      liveResult.mode = 'live';
      emitEvent({
        agent: 'synthesis',
        eventType: 'verification_completed',
        status: 'completed',
        data: liveResult,
        message: `Verification complete: [${liveResult.verdict}] Determination established.`
      });
      return liveResult;
    }

    // Read SSE Stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let streamBuffer = '';
    let finalVerdictPayload = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const lines = streamBuffer.split('\n');
      streamBuffer = lines.pop() || ''; // Keep partial line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // Ignore keepalives or blank lines

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const parsedEvent = JSON.parse(jsonStr);
            emitEvent(parsedEvent);

            if (parsedEvent.eventType === 'verification_completed' && parsedEvent.data) {
              finalVerdictPayload = parsedEvent.data;
            } else if (parsedEvent.eventType === 'verification_aborted') {
              const abortErr = new Error(parsedEvent.message || 'Verification was aborted.');
              abortErr.code = 'ABORTED';
              throw abortErr;
            } else if (parsedEvent.eventType === 'verification_failed') {
              const failErr = new Error(parsedEvent.error || parsedEvent.message || 'Verification failed.');
              failErr.code = 'VERIFICATION_FAILED';
              throw failErr;
            }
          } catch (e) {
            if (e.code === 'ABORTED' || e.code === 'VERIFICATION_FAILED') throw e;
            console.warn('[verificationService] Failed to parse SSE line:', jsonStr, e);
          }
        }
      }
    }

    clearTimeout(timeoutId);

    if (finalVerdictPayload) {
      finalVerdictPayload.mode = 'live';
      return finalVerdictPayload;
    }

    throw new Error('Verification stream ended before a final determination was received.');

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.code === 'ABORTED') {
      const abortErr = new Error('Verification was cancelled by user or timed out.');
      abortErr.code = 'ABORTED';
      abortErr.isAborted = true;
      throw abortErr;
    }

    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      const connErr = new Error(
        `Unable to reach TruthLens backend at ${API_BASE_URL}. Ensure the backend service is running on port 8000, or switch to Demo Fixtures mode.`
      );
      connErr.code = 'CONNECTION_FAILED';
      connErr.isConnectionError = true;
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
    plain_explanation: 'This claim cannot be confirmed based on authoritative announcements or gazette notifications. Treat this forward with caution and verify announcements directly on official portals.',
    evidence: [
      {
        source_name: 'Press Information Bureau (PIB Fact Check) - Govt of India',
        url: 'https://factcheck.pib.gov.in',
        stance: 'CONTEXTUALIZES',
        excerpt: 'Official fact-check division of the Government of India for verifying viral forwards, scheme notices, and public claims.',
        reliability_score: 0.99,
        is_official: true
      },
      {
        source_name: 'National Portal of India (india.gov.in)',
        url: 'https://www.india.gov.in',
        stance: 'CONTEXTUALIZES',
        excerpt: 'Single window access to authenticated information and services provided by the Government of India.',
        reliability_score: 0.98,
        is_official: true
      }
    ],
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
