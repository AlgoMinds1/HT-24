/**
 * Multi-Dimensional Evidence Classification Engine
 * 
 * Classifies evidence items according to:
 * - Claim Relationship: SUPPORTS_CLAIM | CONTRADICTS_CLAIM | CONTEXT_ONLY
 * - Official Authority: OFFICIAL_SOURCE
 * - Temporal Alignment: TIME_RELEVANT
 * 
 * Enforces strict distinction between source credibility and claim support.
 */

const OFFICIAL_DOMAINS = [
  'gov.in',
  'nic.in',
  'pib.gov.in',
  'rbi.org.in',
  'who.int',
  'cdc.gov',
  'sbi.co.in',
  'scholarships.gov.in',
  'india.gov.in',
  'education.gov.in',
  'du.ac.in'
];

/**
 * Checks if a source URL or publisher represents an official primary institution.
 */
export function isOfficialSource(url = '', sourceName = '', domain = '') {
  const normUrl = (url || '').toLowerCase();
  const normDomain = (domain || '').toLowerCase();
  const normName = (sourceName || '').toLowerCase();

  const isOfficialDomain = OFFICIAL_DOMAINS.some(d => 
    normUrl.includes(d) || normDomain.includes(d)
  );

  const isOfficialEntity = 
    normName.includes('ministry') ||
    normName.includes('government') ||
    normName.includes('pib') ||
    normName.includes('reserve bank') ||
    normName.includes('world health organization');

  return Boolean(isOfficialDomain || isOfficialEntity);
}

/**
 * Evaluates whether an evidence item's published date is relevant to the claim context.
 */
export function isTimeRelevant(publishedDate) {
  if (!publishedDate) return false;
  try {
    const pubYear = new Date(publishedDate).getFullYear();
    const currentYear = new Date().getFullYear();
    return (currentYear - pubYear) <= 3;
  } catch {
    return false;
  }
}

/**
 * Identifies core semantic domain / topic of a text.
 */
export function extractCoreTopics(text = '') {
  const lower = text.toLowerCase();
  const topics = new Set();

  if (/\b(scholarship|tuition|stipend|fellowship|educational assistance|vidyalaxmi)\b/.test(lower)) {
    topics.add('SCHOLARSHIP');
  }
  if (/\b(laptop|tablet|electronic device|gadget|smartphone|computer)\b/.test(lower)) {
    topics.add('ELECTRONIC_DEVICE');
  }
  if (/\b(exam|examination|postpone|date-sheet|semester|admit card)\b/.test(lower)) {
    topics.add('EXAMINATIONS');
  }
  if (/\b(cure|cancer|baking soda|lemon|medical|disease|virus|vaccine|health|treatment)\b/.test(lower)) {
    topics.add('HEALTH_CURE');
  }
  if (/\b(kyc|pan card|bank account|debit card|blocked|apk|yono|sbi|phishing)\b/.test(lower)) {
    topics.add('BANKING_KYC');
  }
  if (/\b(electricity|bill|discom|power|subsidy)\b/.test(lower)) {
    topics.add('UTILITY_BILLS');
  }
  if (/\b(repo rate|monetary policy|interest rate|inflation|mpc|cash reserve ratio)\b/.test(lower)) {
    topics.add('MONETARY_POLICY');
  }

  return topics;
}

/**
 * Classifies the exact relationship between an evidence excerpt and the submitted claim.
 * 
 * @param {Object} item - Candidate evidence item
 * @param {string} claimText - The full claim being verified
 * @param {Array<Object>} [assertions=[]] - Extracted atomic assertions
 * @returns {{
 *   claim_relationship: 'SUPPORTS_CLAIM' | 'CONTRADICTS_CLAIM' | 'CONTEXT_ONLY',
 *   stance: 'SUPPORTS' | 'REFUTES' | 'CONTEXTUALIZES',
 *   is_official: boolean,
 *   is_time_relevant: boolean,
 *   labels: string[],
 *   reasoning: string
 * }}
 */
export function classifyEvidenceItem(item, claimText = '', assertions = []) {
  const text = ((item.excerpt || item.raw_content || '') + ' ' + (item.title || '')).toLowerCase();
  const claim = (claimText || '').toLowerCase();

  const isOfficial = isOfficialSource(item.url, item.source_name, item.domain);
  const timeRelevant = isTimeRelevant(item.published_date);

  const claimTopics = extractCoreTopics(claim);
  const evidenceTopics = extractCoreTopics(text);

  // 1. Direct Refutation / Debunk Detection
  const refutingSignals = [
    'fake', 'false', 'hoax', 'debunk', 'refute', 'no scientific basis', 'scam', 'fraud',
    'phishing', 'never sends', 'unproven', 'disproved', 'misinformation', 'caution',
    'not true', 'denies', 'misleading', 'does not cure', 'blocked', 'no such scheme',
    'has not launched any scheme', 'runs no scheme titled', 'fraudulent messages'
  ];

  const hasRefutingSignal = refutingSignals.some(kw => text.includes(kw));

  if (hasRefutingSignal) {
    // CRITICAL: Ensure the refutation actually targets the specific subject of the claim!
    let topicsAlign = false;
    if (claimTopics.size > 0 && evidenceTopics.size > 0) {
      for (const t of claimTopics) {
        if (evidenceTopics.has(t)) {
          topicsAlign = true;
          break;
        }
      }
    } else {
      // If topics cannot be categorized, check for multiple unique matching content words (excluding generic words)
      const genericWords = new Set(['government', 'students', 'student', 'official', 'portal', 'online', 'public', 'message', 'circular', 'notice']);
      const claimKeywords = claim.split(/\s+/).filter(w => w.length > 4 && !genericWords.has(w));
      const matchingCount = claimKeywords.filter(kw => text.includes(kw)).length;
      topicsAlign = matchingCount >= 2;
    }

    // Specific topic alignment checks:
    // A debunk of a scam must ONLY refute a claim that is actually asserting that specific subject!
    let specificallyRefutes = false;

    if (evidenceTopics.has('BANKING_KYC') && /\b(kyc|blocked|yono|pan card|debit card|apk|sms|phishing|otp|cvv)\b/.test(claim)) {
      specificallyRefutes = true;
    }
    if (evidenceTopics.has('UTILITY_BILLS') && /\b(electricity|bill|discom|power)\b/.test(claim)) {
      specificallyRefutes = true;
    }
    if (evidenceTopics.has('ELECTRONIC_DEVICE') && /\b(laptop|tablet|device|gadget|smartphone)\b/.test(claim)) {
      specificallyRefutes = true;
    }
    if (evidenceTopics.has('HEALTH_CURE') && /\b(cure|cancer|baking soda|lemon|disease|treatment)\b/.test(claim)) {
      specificallyRefutes = true;
    }
    if (evidenceTopics.has('EXAMINATIONS') && /\b(exam|postpone|semester|admit card)\b/.test(claim)) {
      specificallyRefutes = true;
    }
    if (evidenceTopics.has('SCHOLARSHIP')) {
      if (text.includes('fake scholarship') || text.includes('no scholarship scheme') || text.includes('scholarship is fake') || text.includes('no such scholarship') || text.includes('fraudulent scholarship')) {
        specificallyRefutes = true;
      }
    }
    if (!specificallyRefutes && claimTopics.size === 0 && evidenceTopics.size === 0) {
      specificallyRefutes = topicsAlign;
    }

    // Critical Safety:
    // If an authoritative institution (e.g. Reserve Bank of India, SBI, PIB, Police) is mentioned in the evidence
    // as the authority issuing an advisory, it must NEVER be treated as refuting the institution itself or its official website!
    const isAuthorityAdvisory = 
      (claim.includes('reserve bank') || claim.includes('rbi') || claim.includes('official website') || claim.includes('official portal')) &&
      !/\b(kyc|blocked|yono|sms|lottery|prize|scam|phishing)\b/.test(claim);

    if (specificallyRefutes && !isAuthorityAdvisory) {
      return {
        claim_relationship: 'CONTRADICTS_CLAIM',
        stance: 'REFUTES',
        is_official: isOfficial,
        is_time_relevant: timeRelevant,
        labels: ['CONTRADICTS_CLAIM', isOfficial ? 'OFFICIAL_SOURCE' : 'FACT_CHECKER'].filter(Boolean),
        reasoning: 'Source explicitly refutes or debunks the specific subject asserted in the claim.'
      };
    }
  }

  // 2. Direct Support Evaluation (Requires Direct Confirmation of Material Assertions)
  // Extract specific unique entities / amounts / identifiers from claim
  const amountMatch = claim.match(/(?:₹|rs\.?|inr|\$)\s*[\d,]+|\b\d{1,3}(?:,\d{3})*(?:\s*(?:rupees|lakh|crore|thousand))?/i);
  const claimedAmount = amountMatch ? amountMatch[0].toLowerCase().replace(/\s+/g, '') : null;

  const dateMatch = claim.match(/(?:before|by|until|on|starting)\s+(\d{1,2}\s+[a-z]+|[a-z]+\s+\d{1,2}|\d{4})/i);
  const claimedDate = dateMatch ? dateMatch[1].toLowerCase() : null;

  let directlySupports = false;

  // Official Portal / Website Verification:
  // If the claim specifically asserts the official website of an authority, and the source is that official authority or registry
  const isDirectWebsiteQuery = 
    (claim.startsWith('home |') || claim.includes('official website of') || claim.startsWith('official portal of')) &&
    !claimedAmount && 
    !claim.includes('giving every') && 
    !claim.includes('free laptop');

  if (isDirectWebsiteQuery && isOfficial) {
    if (
      (claim.includes('reserve bank') && (text.includes('reserve bank') || (item.url && item.url.includes('rbi.org.in')) || (item.domain && item.domain.includes('rbi.org.in')))) ||
      (claim.includes('delhi metro') && (text.includes('delhi metro') || (item.url && item.url.includes('delhimetrorail.com')))) ||
      (claim.includes('state bank') && (text.includes('state bank') || (item.url && item.url.includes('sbi.co.in')))) ||
      (claim.includes('university') && (text.includes('university of delhi') || (item.url && item.url.includes('du.ac.in'))))
    ) {
      directlySupports = true;
    }
  }

  if (claimedAmount && text.includes(claimedAmount)) {
    // Confirms exact financial figure
    directlySupports = true;
  } else if (claimedDate && text.includes(claimedDate) && (text.includes('scheme') || text.includes('deadline'))) {
    // Confirms specific timeline
    directlySupports = true;
  } else if (text.includes('official launch') || text.includes('cabinet approved') || text.includes('notified in the gazette') || text.includes('approved the pm-vidyalaxmi')) {
    // Official announcement with specific matching subject words
    const genericWords = new Set(['government', 'students', 'student', 'official', 'portal', 'online', 'scheme']);
    const nonGenericWords = claim.split(/\s+/).filter(w => w.length > 4 && !genericWords.has(w));
    const matchingWords = nonGenericWords.filter(w => text.includes(w));
    if (matchingWords.length >= 2) {
      directlySupports = true;
    }
  }

  if (directlySupports) {
    return {
      claim_relationship: 'SUPPORTS_CLAIM',
      stance: 'SUPPORTS',
      is_official: isOfficial,
      is_time_relevant: timeRelevant,
      labels: [
        'SUPPORTS_CLAIM', 
        isOfficial ? 'OFFICIAL_SOURCE' : null, 
        timeRelevant ? 'TIME_RELEVANT' : null
      ].filter(Boolean),
      reasoning: 'Source provides direct primary evidence confirming material assertions of the claim.'
    };
  }

  // 3. Context & Baseline Only (Default for General Advisories, Portal Existence, Background)
  // If an advisory merely mentions "scholarships are managed via scholarships.gov.in",
  // or talks about cyber safety or exam dates, it is strictly CONTEXT_ONLY!
  const labels = ['CONTEXT_ONLY'];
  if (isOfficial) labels.push('OFFICIAL_SOURCE');
  if (timeRelevant) labels.push('TIME_RELEVANT');

  return {
    claim_relationship: 'CONTEXT_ONLY',
    stance: 'CONTEXTUALIZES',
    is_official: isOfficial,
    is_time_relevant: timeRelevant,
    labels,
    reasoning: isOfficial
      ? 'Official institutional source provides baseline context or safety guidance, but does not directly establish or confirm the specific assertions.'
      : 'Source provides contextual background without directly confirming or contradicting the specific claim details.'
  };
}
