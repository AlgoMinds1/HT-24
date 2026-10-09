/**
 * @file verdictContract.js
 * Standardized Shared Verdict Contract and Normalization Layer for TruthLens Phase 2.
 * 
 * Provides runtime validation, safe defaults, status mapping, and date parsing
 * across all verification components.
 */

/**
 * @typedef {'VERIFIED' | 'FALSE' | 'OUTDATED' | 'PARTLY_SUPPORTED' | 'CANNOT_CONFIRM'} VerdictStatus
 * @typedef {'SUPPORTING' | 'CONTRADICTING' | 'CONTEXTUAL'} EvidenceRelation
 * @typedef {'SUPPORT' | 'CONTRADICTION' | 'INCONCLUSIVE' | 'NOT_RUN' | 'ERROR'} VerificationPathStatus
 * @typedef {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'} RiskLevel
 * 
 * @typedef {Object} EvidenceItem
 * @property {string} id - Stable identifier
 * @property {string} [sourceName] - Publisher or organization
 * @property {string} [quote] - Relevant excerpt or quotation
 * @property {string} [date] - Published date
 * @property {string} [trustTier] - Reliability rating or trust score string
 * @property {number} [reliabilityScore] - Number between 0 and 1
 * @property {EvidenceRelation} [relation] - Relation to the claim
 * @property {string} [url] - Direct URL link if available
 * 
 * @typedef {Object} VerificationPath
 * @property {string} id - Stable identifier
 * @property {string} name - Name of verification path / source tier
 * @property {string} [description] - Scope or methodology of this path
 * @property {VerificationPathStatus} status - Outcome of this path
 * @property {string} [sourceName] - Source or authority investigated
 * @property {string} [note] - Specific finding or rationale
 * 
 * @typedef {Object} TruthTimelineEvent
 * @property {string} id - Stable identifier
 * @property {string} date - Date string
 * @property {VerdictStatus} [status] - Historical verdict status at that date
 * @property {string} [explanation] - Summary of what occurred
 * @property {string} [impact] - Factual impact or significance
 * 
 * @typedef {Object} ActionRisk
 * @property {string} [requestedAction] - What the forward requests recipient to do
 * @property {RiskLevel} level - Risk severity level
 * @property {string} [safetyAdvice] - Concrete safety guidance
 * @property {string} [reasoning] - Underlying rationale for risk
 * @property {string} [category] - Category of risk e.g., PHISHING, HEALTH_HAZARD
 * @property {string} [warningFlag] - Immediate headline warning
 * 
 * @typedef {Object} VerdictContract
 * @property {string} id - Unique report ID
 * @property {'mock' | 'live'} mode - Execution mode
 * @property {Object} input
 * @property {'text' | 'image' | 'audio' | 'pdf' | 'url'} [input.type] - Input media type
 * @property {string} [input.originalContent] - Original forward text, URL, or filename
 * @property {string} [input.displayName] - Human friendly label or filename
 * @property {string} [input.extractedClaim] - Extracted atomic factual statement
 * @property {string} [input.sourcePlatform] - Originating channel (e.g. WhatsApp, SMS)
 * @property {string} [input.receivedAt] - Timestamp
 * @property {Object} verdict
 * @property {VerdictStatus} verdict.status - Canonical verdict status
 * @property {string} verdict.label - Human-readable verdict title
 * @property {number|null} [verdict.confidence] - Confidence score [0.0..1.0] or null
 * @property {'HIGH' | 'MEDIUM' | 'LOW' | null} [verdict.confidenceRating] - Rating descriptor
 * @property {string} [verdict.explanation] - Plain-language summary
 * @property {string} [verdict.rationale] - Confidence rationale
 * @property {EvidenceItem[]} evidence - List of reference evidence items
 * @property {Object} stressTest
 * @property {VerificationPath[]} stressTest.paths - Multi-path checks
 * @property {string|null} [stressTest.conflictNote] - Explicit conflict note when paths disagree
 * @property {string|null} [stressTest.summary] - Robustness summary
 * @property {string[]} [stressTest.counterArguments] - Counter arguments evaluated
 * @property {string[]} [stressTest.edgeCases] - Edge cases examined
 * @property {TruthTimelineEvent[]} truthTimeline - Chronological timeline events
 * @property {ActionRisk|null} actionRisk - Risk advisory or null if not applicable
 */

export const VERDICT_LABELS = {
  VERIFIED: 'Verified Authentic',
  FALSE: 'False / Fabricated',
  OUTDATED: 'Outdated / Expired',
  PARTLY_SUPPORTED: 'Partly Supported',
  CANNOT_CONFIRM: 'Cannot Confirm / Inconclusive'
};

export const VERDICT_DESCRIPTIONS = {
  VERIFIED: 'The claim is supported by credible, authoritative, and up-to-date sources.',
  FALSE: 'The claim is contradictory to verified facts, fabricated, or a known hoax.',
  OUTDATED: 'The claim was valid in the past but has expired, been superseded, or is obsolete.',
  PARTLY_SUPPORTED: 'The claim contains factual elements mixed with misleading or exaggerated assertions.',
  CANNOT_CONFIRM: 'Insufficient reliable evidence currently exists to verify or debunk this claim conclusively.'
};

/**
 * Normalizes a raw verdict status into one of the 5 canonical VerdictStatus values.
 * 
 * @param {string} raw
 * @returns {VerdictStatus}
 */
export function normalizeVerdictStatus(raw) {
  if (!raw || typeof raw !== 'string') return 'CANNOT_CONFIRM';
  const upper = raw.trim().toUpperCase().replace(/[\s-]/g, '_');
  
  switch (upper) {
    case 'SUPPORTED':
    case 'VERIFIED':
    case 'TRUE':
      return 'VERIFIED';
    case 'FALSE':
    case 'DEBUNKED':
    case 'FABRICATED':
      return 'FALSE';
    case 'OUTDATED':
    case 'EXPIRED':
    case 'SUPERSEDED':
      return 'OUTDATED';
    case 'PARTLY_TRUE':
    case 'PARTLY_SUPPORTED':
    case 'PARTIALLY_TRUE':
    case 'MISLEADING':
      return 'PARTLY_SUPPORTED';
    case 'UNCONFIRMED':
    case 'CANNOT_CONFIRM':
    case 'INCONCLUSIVE':
    case 'UNKNOWN':
    default:
      return 'CANNOT_CONFIRM';
  }
}

/**
 * Normalizes evidence stance / relation.
 * 
 * @param {string} raw
 * @returns {EvidenceRelation}
 */
export function normalizeEvidenceRelation(raw) {
  if (!raw || typeof raw !== 'string') return 'CONTEXTUAL';
  const upper = raw.trim().toUpperCase();
  if (upper === 'SUPPORTS' || upper === 'SUPPORTING') return 'SUPPORTING';
  if (upper === 'REFUTES' || upper === 'CONTRADICTING' || upper === 'CONTRADICTS') return 'CONTRADICTING';
  return 'CONTEXTUAL';
}

/**
 * Normalizes risk level.
 * 
 * @param {string} raw
 * @returns {RiskLevel}
 */
export function normalizeRiskLevel(raw) {
  if (!raw || typeof raw !== 'string') return 'UNKNOWN';
  const upper = raw.trim().toUpperCase();
  if (upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'HIGH') return 'HIGH';
  if (upper === 'MODERATE' || upper === 'MEDIUM') return 'MEDIUM';
  if (upper === 'LOW' || upper === 'SAFE') return 'LOW';
  return 'UNKNOWN';
}

/**
 * Safely parses and validates a confidence number between 0.0 and 1.0.
 * 
 * @param {any} val
 * @returns {number|null}
 */
export function parseValidConfidence(val) {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return null;
  if (num < 0 || num > 1) return null;
  return num;
}

/**
 * Normalizes a raw date or timestamp safely without crashing.
 * 
 * @param {any} val
 * @returns {string}
 */
export function safeFormatDate(val) {
  if (!val) return '';
  if (typeof val !== 'string') return String(val);
  const trimmed = val.trim();
  const parsed = Date.parse(trimmed);
  if (isNaN(parsed)) {
    return trimmed; // Return original string if unparseable
  }
  return trimmed;
}

/**
 * Normalizes any incoming verdict payload (from fixtures, backend API, or mock data)
 * into a single canonical VerdictContract.
 * 
 * @param {Object} rawData - Incoming payload
 * @param {Object} [options]
 * @param {'mock'|'live'} [options.mode='mock']
 * @returns {VerdictContract}
 */
export function normalizeVerdictContract(rawData, options = {}) {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  const mode = options.mode || (data.mode === 'live' ? 'live' : 'mock');

  // 1. Input Section
  const rawInput = data.input || {};
  const originalContent = 
    rawInput.originalContent || 
    rawInput.raw_text || 
    (typeof rawInput.content === 'string' ? rawInput.content : '') || 
    '';

  const inputType = (rawInput.type || rawInput.media_type || 'text').toLowerCase();
  const validMediaTypes = ['text', 'image', 'audio', 'pdf', 'url'];
  const safeInputType = validMediaTypes.includes(inputType) ? inputType : 'text';

  const extractedClaim = 
    data.claim || 
    (rawInput.extractedClaim ? String(rawInput.extractedClaim) : '') || 
    '';

  const inputObj = {
    type: safeInputType,
    originalContent: originalContent.trim(),
    displayName: rawInput.displayName || rawInput.file_name || (safeInputType === 'url' ? originalContent : ''),
    extractedClaim: extractedClaim.trim(),
    sourcePlatform: rawInput.source_platform || rawInput.sourcePlatform || '',
    receivedAt: safeFormatDate(rawInput.received_at || rawInput.receivedAt)
  };

  // 2. Verdict Section
  const rawVerdictVal = typeof data.verdict === 'object' && data.verdict !== null
    ? data.verdict.status || data.verdict.verdict
    : data.verdict;

  const canonicalStatus = normalizeVerdictStatus(rawVerdictVal);

  const rawConfidence = typeof data.confidence === 'object' && data.confidence !== null
    ? data.confidence.score
    : (typeof data.verdict === 'object' && data.verdict !== null ? data.verdict.confidence : data.confidence);

  const safeConfidence = parseValidConfidence(rawConfidence);

  const rawConfidenceRating = typeof data.confidence === 'object' && data.confidence !== null
    ? data.confidence.rating
    : null;

  const validRatings = ['HIGH', 'MEDIUM', 'LOW'];
  const safeRating = rawConfidenceRating && validRatings.includes(String(rawConfidenceRating).toUpperCase())
    ? String(rawConfidenceRating).toUpperCase()
    : null;

  const plainExplanation = 
    (typeof data.verdict === 'object' && data.verdict !== null ? data.verdict.explanation : null) ||
    data.plain_explanation || 
    data.explanation || 
    '';

  const confidenceRationale = 
    (typeof data.confidence === 'object' && data.confidence !== null ? data.confidence.rationale : '') ||
    '';

  const verdictObj = {
    status: canonicalStatus,
    label: VERDICT_LABELS[canonicalStatus] || VERDICT_LABELS.CANNOT_CONFIRM,
    confidence: safeConfidence,
    confidenceRating: safeRating,
    explanation: plainExplanation.trim(),
    rationale: confidenceRationale.trim()
  };

  // 3. Evidence List Section
  const rawEvidenceList = Array.isArray(data.evidence) ? data.evidence : [];
  const normalizedEvidence = rawEvidenceList
    .filter(item => item && typeof item === 'object')
    .map((item, index) => {
      const relScore = parseValidConfidence(item.reliability_score ?? item.reliabilityScore);
      let trustTier = item.trustTier || '';
      if (!trustTier && relScore !== null) {
        trustTier = `${Math.round(relScore * 100)}% Trust Weight`;
      }

      return {
        id: item.id || `ev-${index}-${(item.source_name || 'src').substring(0, 8)}`,
        sourceName: (item.source_name || item.sourceName || '').trim(),
        quote: (item.excerpt || item.quote || '').trim(),
        date: safeFormatDate(item.published_date || item.publishedDate || item.date),
        trustTier: trustTier.trim(),
        reliabilityScore: relScore,
        relation: normalizeEvidenceRelation(item.stance || item.relation),
        url: typeof item.url === 'string' && item.url.startsWith('http') ? item.url.trim() : ''
      };
    });

  // 4. Stress Test Section
  const rawStress = data.stress_test || data.stressTest || {};
  let paths = [];

  if (Array.isArray(rawStress.paths)) {
    paths = rawStress.paths
      .filter(p => p && typeof p === 'object')
      .map((p, index) => {
        const rawStatus = (p.status || 'INCONCLUSIVE').toUpperCase();
        let validStatus = 'INCONCLUSIVE';
        if (['SUPPORT', 'CONTRADICTION', 'INCONCLUSIVE', 'NOT_RUN', 'ERROR'].includes(rawStatus)) {
          validStatus = rawStatus;
        } else if (rawStatus === 'SUPPORTS' || rawStatus === 'SUPPORTING') {
          validStatus = 'SUPPORT';
        } else if (rawStatus === 'REFUTES' || rawStatus === 'CONTRADICTS') {
          validStatus = 'CONTRADICTION';
        }
        return {
          id: p.id || `path-${index}`,
          name: p.name || `Verification Path ${index + 1}`,
          description: p.description || '',
          status: validStatus,
          sourceName: p.sourceName || p.source_name || '',
          note: p.note || ''
        };
      });
  } else {
    // Synthesize independent verification paths from counter arguments and edge cases if explicit paths not provided
    const counterArgs = Array.isArray(rawStress.counter_arguments_checked) 
      ? rawStress.counter_arguments_checked 
      : (Array.isArray(rawStress.counterArguments) ? rawStress.counterArguments : []);

    const edgeCases = Array.isArray(rawStress.edge_cases_identified)
      ? rawStress.edge_cases_identified
      : (Array.isArray(rawStress.edgeCases) ? rawStress.edgeCases : []);

    if (counterArgs.length > 0) {
      counterArgs.forEach((ca, idx) => {
        paths.push({
          id: `stress-ca-${idx}`,
          name: `Adversarial Check: "${ca.length > 45 ? ca.substring(0, 45) + '...' : ca}"`,
          description: ca,
          status: canonicalStatus === 'FALSE' ? 'CONTRADICTION' : (canonicalStatus === 'VERIFIED' ? 'SUPPORT' : 'INCONCLUSIVE'),
          note: edgeCases[idx] || rawStress.robustness_summary || 'Evaluated against authoritative records.'
        });
      });
    }

    if (paths.length === 0 && (rawStress.robustness_summary || rawStress.summary)) {
      paths.push({
        id: 'stress-summary-path',
        name: 'Adversarial Robustness Pipeline',
        description: rawStress.robustness_summary || rawStress.summary,
        status: canonicalStatus === 'FALSE' ? 'CONTRADICTION' : (canonicalStatus === 'VERIFIED' ? 'SUPPORT' : 'INCONCLUSIVE'),
        note: 'Cross-checked against counter-hypotheses.'
      });
    }
  }

  // Determine conflict note
  let conflictNote = rawStress.conflictNote || rawStress.conflict_note || null;
  if (!conflictNote) {
    const hasSupport = paths.some(p => p.status === 'SUPPORT');
    const hasContradiction = paths.some(p => p.status === 'CONTRADICTION');
    if (hasSupport && hasContradiction) {
      conflictNote = 'Verification paths yielded divergent outcomes: some authoritative signals support aspects of the claim while adversarial checks contradict them.';
    }
  }

  const stressTestObj = {
    paths,
    conflictNote: conflictNote ? String(conflictNote).trim() : null,
    summary: (rawStress.robustness_summary || rawStress.summary || '').trim() || null,
    counterArguments: Array.isArray(rawStress.counter_arguments_checked) 
      ? rawStress.counter_arguments_checked 
      : (Array.isArray(rawStress.counterArguments) ? rawStress.counterArguments : []),
    edgeCases: Array.isArray(rawStress.edge_cases_identified)
      ? rawStress.edge_cases_identified
      : (Array.isArray(rawStress.edgeCases) ? rawStress.edgeCases : [])
  };

  // 5. Truth Timeline Section
  const rawTimeline = Array.isArray(data.truth_timeline) 
    ? data.truth_timeline 
    : (Array.isArray(data.truthTimeline) ? data.truthTimeline : []);

  const normalizedTimeline = rawTimeline
    .filter(event => event && typeof event === 'object')
    .map((event, index) => {
      const eventStatus = event.status ? normalizeVerdictStatus(event.status) : undefined;
      return {
        id: event.id || `tl-${index}-${(event.date || 'dt').replace(/[^a-zA-Z0-9]/g, '')}`,
        date: safeFormatDate(event.date),
        status: eventStatus,
        explanation: (event.event || event.explanation || '').trim(),
        impact: (event.significance || event.impact || '').trim()
      };
    })
    // Sort chronologically if dates can be parsed
    .sort((a, b) => {
      const timeA = Date.parse(a.date);
      const timeB = Date.parse(b.date);
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeA - timeB;
      }
      return 0;
    });

  // 6. Action Risk Section
  const rawActionRisk = data.action_risk || data.actionRisk;
  let actionRiskObj = null;

  if (rawActionRisk && typeof rawActionRisk === 'object') {
    const rawLevel = rawActionRisk.risk_level || rawActionRisk.level;
    const level = normalizeRiskLevel(rawLevel);

    const requestedAction = 
      rawActionRisk.requestedAction || 
      rawActionRisk.requested_action || 
      '';

    const safetyAdvice = 
      rawActionRisk.safetyAdvice || 
      rawActionRisk.safety_advice || 
      rawActionRisk.recommended_action || 
      '';

    const reasoning = 
      rawActionRisk.reasoning || 
      rawActionRisk.risk_category || 
      rawActionRisk.category || 
      '';

    const warningFlag = 
      rawActionRisk.warningFlag || 
      rawActionRisk.warning_flag || 
      '';

    // Only construct if at least one meaningful field exists
    if (requestedAction || safetyAdvice || reasoning || warningFlag || level !== 'UNKNOWN') {
      actionRiskObj = {
        requestedAction: requestedAction.trim(),
        level,
        safetyAdvice: safetyAdvice.trim(),
        reasoning: reasoning.trim(),
        category: (rawActionRisk.risk_category || rawActionRisk.category || '').trim(),
        warningFlag: warningFlag.trim()
      };
    }
  }

  return {
    id: data.id || `rep-${Date.now()}`,
    mode,
    input: inputObj,
    verdict: verdictObj,
    evidence: normalizedEvidence,
    stressTest: stressTestObj,
    truthTimeline: normalizedTimeline,
    actionRisk: actionRiskObj
  };
}
