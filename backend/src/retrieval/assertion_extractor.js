/**
 * Assertion Extraction and Claim Decomposition Engine
 * Breaks down complex, unstructured forwarded messages into atomic factual assertions
 * that must be individually verified against retrieved evidence.
 */

/**
 * Extracts atomic factual assertions from any arbitrary claim or forward text.
 * 
 * @param {string} text - The input claim text
 * @returns {Array<{
 *   id: string,
 *   assertion: string,
 *   type: 'POLICY_SCHEME' | 'FINANCIAL_BENEFIT' | 'ELIGIBILITY' | 'DEADLINE' | 'ACTION_CHANNEL' | 'FACTUAL_STATEMENT',
 *   key_terms: string[],
 *   direct_evidence_required: string
 * }>}
 */
export function extractAssertions(text) {
  if (!text || typeof text !== 'string') return [];

  const cleaned = text.trim();
  const assertions = [];

  // 1. Segment text into clause / sentence units
  const sentences = cleaned
    .replace(/([.?!])\s+/g, '$1|SPLIT|')
    .replace(/(;\s+)/g, '|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  let idCounter = 1;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Check for financial amount assertions (e.g., ₹50,000, 50,000 rupees, 5000, Rs. 10000)
    const amountMatch = sentence.match(/(?:₹|rs\.?|inr|\$)\s*[\d,]+|\b\d{1,3}(?:,\d{3})*(?:\s*(?:rupees|lakh|crore|thousand))?/i);
    const hasAmount = amountMatch && amountMatch[0].trim().length > 0 && /\d/.test(amountMatch[0]);

    // Check for deadline / temporal assertions
    const dateMatch = sentence.match(/(?:before|by|until|on|starting|starts)\s+(?:\d{1,2}\s+[a-z]+|[a-z]+\s+\d{1,2}|next\s+month|tomorrow|tonight|\d{4})/i);

    // Check for eligibility assertions
    const hasEligibility = /\b(every|all|eligible|students?|citizens?|women|farmers?|beneficiar(?:y|ies))\b/i.test(sentence);

    // Check for channel / registration portal assertions
    const hasChannel = /\b(register|portal|link|website|apply|form|aadhaar|download|app)\b/i.test(sentence);

    // Check for scheme / government announcement assertions
    const hasScheme = /\b(government|pm|scheme|yojana|ministry|announced|initiative|launched|giving|giving out)\b/i.test(sentence);

    if (hasAmount) {
      assertions.push({
        id: `assertion-${idCounter++}`,
        assertion: `The benefit amount of ${amountMatch[0]} is provided as asserted.`,
        type: 'FINANCIAL_BENEFIT',
        key_terms: [amountMatch[0].toLowerCase(), 'amount', 'benefit'],
        direct_evidence_required: `Official notification or budget specifying the exact grant/disbursement of ${amountMatch[0]}.`
      });
    }

    if (hasEligibility && (hasScheme || hasAmount)) {
      assertions.push({
        id: `assertion-${idCounter++}`,
        assertion: `The eligibility scope applies broadly as stated ("${sentence.slice(0, 80)}...").`,
        type: 'ELIGIBILITY',
        key_terms: ['eligible', 'eligibility', 'students', 'beneficiaries'],
        direct_evidence_required: 'Official eligibility criteria gazette verifying that the defined cohort qualifies unconditionally.'
      });
    }

    if (dateMatch) {
      assertions.push({
        id: `assertion-${idCounter++}`,
        assertion: `Registration or effective timeline is set for ${dateMatch[0]}.`,
        type: 'DEADLINE',
        key_terms: [dateMatch[0].toLowerCase(), 'deadline', 'date'],
        direct_evidence_required: `Official circular confirming the active timeline or deadline of ${dateMatch[0]}.`
      });
    }

    if (hasChannel) {
      assertions.push({
        id: `assertion-${idCounter++}`,
        assertion: `An application channel or registration procedure exists via the claimed portal/link.`,
        type: 'ACTION_CHANNEL',
        key_terms: ['portal', 'registration', 'link', 'apply'],
        direct_evidence_required: 'Legitimate government portal hosting an active registration form for this specific program.'
      });
    }

    if (hasScheme && !hasAmount && !dateMatch) {
      assertions.push({
        id: `assertion-${idCounter++}`,
        assertion: sentence,
        type: 'POLICY_SCHEME',
        key_terms: sentence.toLowerCase().split(/\s+/).filter(w => w.length > 4),
        direct_evidence_required: 'Official press release, gazette notification, or ministry portal confirming the policy launch.'
      });
    }
  }

  // If no specialized pattern triggered, produce at least one generalized assertion
  if (assertions.length === 0) {
    assertions.push({
      id: `assertion-1`,
      assertion: cleaned,
      type: 'FACTUAL_STATEMENT',
      key_terms: cleaned.toLowerCase().split(/\s+/).filter(w => w.length > 4),
      direct_evidence_required: 'Direct authoritative confirmation establishing the central asserted statement.'
    });
  }

  return assertions;
}
