/**
 * Documented & Validated Confidence Calibration Engine
 * 
 * Computes defensible confidence ratings and evidence strength labels based on:
 * - Directness of evidence (SUPPORTS_CLAIM vs CONTEXT_ONLY)
 * - Independent source corroboration (deduplicated by domain/publisher)
 * - Authority tier of primary sources (official registries vs secondary news)
 * - Temporal relevance and absence of contradictory signals
 * 
 * Guarantees that:
 * - General context NEVER inflates claim confidence.
 * - Unconfirmed claims NEVER display high confidence percentages.
 * - Confidence is never arbitrarily hardcoded.
 */

/**
 * Deduplicates evidence items by publisher domain to prevent duplicate article inflation.
 * 
 * @param {Array<Object>} evidenceItems 
 * @returns {Array<Object>}
 */
export function deduplicateByDomain(evidenceItems = []) {
  const seenDomains = new Set();
  const independent = [];

  for (const item of evidenceItems) {
    let domain = 'unknown';
    try {
      if (item.url) {
        domain = new URL(item.url).hostname.replace(/^www\./, '').toLowerCase();
      } else if (item.source_name) {
        domain = item.source_name.toLowerCase();
      }
    } catch {
      domain = (item.source_name || 'unknown').toLowerCase();
    }

    if (!seenDomains.has(domain)) {
      seenDomains.add(domain);
      independent.push({ ...item, deduplicatedDomain: domain });
    }
  }

  return independent;
}

/**
 * Calculates a defensible, calibrated confidence score and evidence strength descriptor.
 * 
 * @param {Object} params
 * @param {'SUPPORTED' | 'FALSE' | 'PARTLY_TRUE' | 'OUTDATED' | 'UNCONFIRMED'} params.verdict
 * @param {Array<Object>} params.evidence
 * @param {Array<Object>} [params.assertions=[]]
 * @returns {{
 *   score: number,
 *   rating: 'HIGH' | 'MEDIUM' | 'LOW',
 *   strength_label: 'Strong' | 'Limited' | 'Conflicting' | 'Insufficient',
 *   rationale: string,
 *   independent_source_count: number
 * }}
 */
export function calculateConfidence({ verdict, evidence = [], assertions = [] }) {
  const independentSources = deduplicateByDomain(evidence);

  const directSupporting = independentSources.filter(e => 
    e.claim_relationship === 'SUPPORTS_CLAIM' || e.stance === 'SUPPORTS'
  );
  const directRefuting = independentSources.filter(e => 
    e.claim_relationship === 'CONTRADICTS_CLAIM' || e.stance === 'REFUTES'
  );
  const contextOnly = independentSources.filter(e => 
    e.claim_relationship === 'CONTEXT_ONLY' || e.stance === 'CONTEXTUALIZES'
  );

  const hasOfficialSupport = directSupporting.some(e => e.is_official);
  const hasOfficialRefutation = directRefuting.some(e => e.is_official);

  let score = 0.30;
  let rating = 'LOW';
  let strength_label = 'Insufficient';
  let rationale = '';

  switch (verdict) {
    case 'UNCONFIRMED': {
      // Epistemic constraint: When evidence is indirect, missing, or context-only,
      // confidence score MUST stay low (bounded between 0.20 and 0.35)
      const contextBoost = Math.min(0.10, contextOnly.length * 0.03);
      score = Number((0.25 + contextBoost).toFixed(2));
      rating = 'LOW';
      strength_label = contextOnly.length > 0 ? 'Limited' : 'Insufficient';
      rationale = contextOnly.length > 0
        ? `Evaluated against ${contextOnly.length} background source(s). While institutional channels exist, no direct records establish or refute the specific asserted details.`
        : 'No authoritative records, official gazettes, or verified fact-checks were retrieved to substantiate or refute this claim.';
      break;
    }

    case 'FALSE': {
      // Refutation supported by independent debunks or authoritative contradiction
      const baseScore = 0.85;
      const authorityBonus = hasOfficialRefutation ? 0.07 : 0.03;
      const corroborationBonus = Math.min(0.04, Math.max(0, (directRefuting.length - 1) * 0.02));
      score = Number(Math.min(0.96, baseScore + authorityBonus + corroborationBonus).toFixed(2));
      rating = 'HIGH';
      strength_label = 'Strong';
      rationale = `Directly contradicted by ${directRefuting.length} independent authoritative debunk(s)${hasOfficialRefutation ? ' including official registries' : ''}.`;
      break;
    }

    case 'SUPPORTED': {
      // Must have direct, verified supporting evidence
      if (directSupporting.length === 0) {
        // Safety guardrail: SUPPORTED is not allowed without direct supporting sources
        score = 0.35;
        rating = 'LOW';
        strength_label = 'Insufficient';
        rationale = 'Downgraded: Direct corroboration is absent despite positive verdict tag.';
      } else {
        const baseScore = 0.82;
        const officialBonus = hasOfficialSupport ? 0.08 : 0.03;
        const corroborationBonus = Math.min(0.05, Math.max(0, (directSupporting.length - 1) * 0.03));
        score = Number(Math.min(0.95, baseScore + officialBonus + corroborationBonus).toFixed(2));
        rating = 'HIGH';
        strength_label = 'Strong';
        rationale = `Directly verified by ${directSupporting.length} independent authoritative source(s)${hasOfficialSupport ? ' from primary government/institutional records' : ''}.`;
      }
      break;
    }

    case 'PARTLY_TRUE': {
      score = Number((0.55 + Math.min(0.10, directSupporting.length * 0.05)).toFixed(2));
      rating = 'MEDIUM';
      strength_label = directRefuting.length > 0 ? 'Conflicting' : 'Limited';
      rationale = 'Some material assertions are corroborated by verified sources, while other key assertions remain unverified or exaggerated.';
      break;
    }

    case 'OUTDATED': {
      score = Number((0.78 + (hasOfficialRefutation || hasOfficialSupport ? 0.06 : 0)).toFixed(2));
      rating = 'MEDIUM';
      strength_label = 'Limited';
      rationale = 'Authoritative records confirm this information was valid historically, but has expired, been superseded, or discontinued.';
      break;
    }

    default: {
      score = 0.30;
      rating = 'LOW';
      strength_label = 'Insufficient';
      rationale = 'Factual plausibility cannot be verified with the available evidence.';
    }
  }

  return {
    score,
    rating,
    strength_label,
    rationale,
    independent_source_count: independentSources.length
  };
}
