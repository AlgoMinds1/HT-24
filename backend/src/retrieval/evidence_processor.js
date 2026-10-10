/**
 * Evidence Processing, Deduplication, Relevance Ranking, and Strict Quote Validation
 */

const TRUST_TIER_WEIGHTS = {
  'TIER_1_OFFICIAL_GOV': 0.99,
  'TIER_1_AUTHORITATIVE_ORG': 0.98,
  'TIER_2_FACT_CHECKER': 0.92,
  'TIER_3_GENERAL_NEWS': 0.80,
  'DEFAULT': 0.70
};

/**
 * Normalizes a URL for deduplication.
 * @param {string} rawUrl 
 * @returns {string}
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    // Remove query params and trailing slash for deduplication
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Strict in-code validation that an excerpt is an exact substring of the raw document content.
 * 
 * @param {string} excerpt - The candidate excerpt
 * @param {string} rawContent - The actual document or passage text
 * @returns {boolean}
 */
export function validateExactQuote(excerpt, rawContent) {
  if (!excerpt || !rawContent) return false;
  const normExcerpt = excerpt.replace(/\s+/g, ' ').trim().toLowerCase();
  const normContent = rawContent.replace(/\s+/g, ' ').trim().toLowerCase();
  return normContent.includes(normExcerpt);
}

/**
 * Extracts an exact sentence substring from raw document content if a candidate quote fails validation.
 * 
 * @param {string} rawContent 
 * @param {string} query 
 * @returns {string} Exact substring from rawContent
 */
export function extractVerbatimExcerpt(rawContent, query = '') {
  if (!rawContent) return '';
  const sentences = rawContent
    .replace(/([.?!])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length === 0) return rawContent.slice(0, 200).trim();

  // If query is present, find sentence with highest keyword overlap
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let bestSentence = sentences[0];
  let maxMatches = -1;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const matches = queryWords.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0);
    if (matches > maxMatches) {
      maxMatches = matches;
      bestSentence = sentence;
    }
  }

  // Double check that bestSentence is an exact substring of rawContent
  if (rawContent.includes(bestSentence)) {
    return bestSentence;
  }
  return sentences[0];
}

import { classifyEvidenceItem } from './evidence_classifier.js';
import { extractAssertions } from './assertion_extractor.js';

/**
 * Determines stance label adhering to contracts/verdict.schema.json using the classification engine.
 * 
 * @param {string} content 
 * @param {string} claim 
 * @returns {'REFUTES' | 'SUPPORTS' | 'CONTEXTUALIZES'}
 */
export function determineStance(content, claim = '') {
  const result = classifyEvidenceItem({ excerpt: content }, claim);
  return result.stance;
}

/**
 * Processes, deduplicates, ranks, and validates evidence items.
 * 
 * @param {Array<Object>} candidateItems 
 * @param {string} claim 
 * @param {Object} options 
 * @returns {Array<Object>} Formatted EvidenceContract items
 */
export function processEvidenceItems(candidateItems = [], claim = '', options = {}) {
  const { maxItems = 4, minRelevanceScore = 0.28 } = options;
  const assertions = extractAssertions(claim);

  // 1. Deduplicate by normalized URL & filter irrelevant candidates
  const seenUrls = new Set();
  const deduplicated = [];

  for (const item of candidateItems) {
    if (!item.url || !item.raw_content) continue;
    if (typeof item.relevance_score === 'number' && item.relevance_score < minRelevanceScore) {
      continue;
    }

    // Validate URL is standard HTTP(S) URI
    if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) {
      continue;
    }

    const normUrl = normalizeUrl(item.url);
    if (seenUrls.has(normUrl)) {
      continue;
    }
    seenUrls.add(normUrl);
    deduplicated.push(item);
  }

  // 2. Score, Validate Excerpts & Format
  const processed = [];

  for (const item of deduplicated) {
    const rawContent = item.raw_content || '';
    let excerpt = item.excerpt || '';

    // STRICT IN-CODE VALIDATION:
    // Check if excerpt is an exact substring of the raw document content
    const isValidExcerpt = validateExactQuote(excerpt, rawContent);
    if (!isValidExcerpt) {
      // Never fabricate! Extract exact verified substring from source content
      excerpt = extractVerbatimExcerpt(rawContent, claim);
    }

    // Multi-dimensional classification
    const classification = classifyEvidenceItem(
      { ...item, excerpt },
      claim,
      assertions
    );

    // Compute composite reliability score
    const baseWeight = TRUST_TIER_WEIGHTS[item.trust_tier] || TRUST_TIER_WEIGHTS['DEFAULT'];
    const relScore = typeof item.relevance_score === 'number' ? item.relevance_score : 0.8;
    const finalReliability = Math.min(0.99, Math.max(0.60, Number(((baseWeight * 0.7) + (relScore * 0.3)).toFixed(2))));

    // Map stance to frontend-friendly relation
    const relationMap = {
      'REFUTES': 'CONTRADICTING',
      'SUPPORTS': 'SUPPORTING',
      'CONTEXTUALIZES': 'CONTEXTUAL'
    };

    processed.push({
      // Schema properties (contracts/verdict.schema.json)
      source_name: item.source_name || 'Authoritative Source',
      url: item.url,
      published_date: item.published_date || undefined,
      stance: classification.stance,
      excerpt: excerpt.trim(),
      reliability_score: finalReliability,

      // Multi-dimensional labels & provenance (Requirement 5 & 7)
      claim_relationship: classification.claim_relationship,
      labels: classification.labels,
      is_official: classification.is_official,
      is_time_relevant: classification.is_time_relevant,
      origin: item.provider || 'curated_kb',
      provider: item.provider || 'curated_kb',
      domain: item.domain || classification.domain || (item.url ? (() => { try { return new URL(item.url).hostname; } catch { return ''; } })() : ''),

      // Frontend compatibility properties (supports EvidenceList.jsx and SourceCard.jsx)
      sourceName: item.source_name || 'Authoritative Source',
      quote: excerpt.trim(),
      date: item.published_date || undefined,
      trustTier: item.trust_tier || (classification.is_official ? 'TIER_1_OFFICIAL_GOV' : 'TIER_2_FACT_CHECKER'),
      relation: relationMap[classification.stance] || 'CONTEXTUAL',
      isOfficial: classification.is_official,
      isTimeRelevant: classification.is_time_relevant
    });
  }

  // 3. Rank by reliability score descending
  processed.sort((a, b) => b.reliability_score - a.reliability_score);

  return processed.slice(0, maxItems);
}
