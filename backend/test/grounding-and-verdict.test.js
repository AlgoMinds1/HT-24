/**
 * @file grounding-and-verdict.test.js
 * Comprehensive Grounding & Verdict Accuracy Test Suite for TruthLens
 * 
 * Validates:
 * 1. Direct supporting evidence
 * 2. Direct contradictory evidence
 * 3. General context that does not establish the claim
 * 4. Conflicting sources
 * 5. Duplicate sources (deduplication & independent corroboration)
 * 6. Outdated information
 * 7. No search results (search failure is not proof of falsity)
 * 8. Search-provider failure
 * 9. Unsupported scholarship claim regression test
 * 10. Fabricated or invalid source metadata (exact quote validation & URL sanitation)
 */

import { extractAssertions } from '../src/retrieval/assertion_extractor.js';
import { classifyEvidenceItem, isOfficialSource, isTimeRelevant } from '../src/retrieval/evidence_classifier.js';
import { calculateConfidence, deduplicateByDomain } from '../src/services/confidence_engine.js';
import { processEvidenceItems, validateExactQuote, extractVerbatimExcerpt } from '../src/retrieval/evidence_processor.js';
import { buildUnconfirmedPayload, synthesizeFallbackVerdict } from '../src/services/groq.service.js';
import { validateVerdictPayload } from '../src/validators/verdict.validator.js';

export function runGroundingTests() {
  let passCount = 0;
  let failCount = 0;
  const logs = [];

  function assert(condition, message) {
    if (condition) {
      logs.push(`✓ PASS: ${message}`);
      passCount++;
    } else {
      logs.push(`✗ FAIL: ${message}`);
      failCount++;
    }
  }

  logs.push('================================================================');
  logs.push('🧪 TRUTHLENS GROUNDING, ACCURACY & REGRESSION TEST SUITE');
  logs.push('================================================================');

  // -----------------------------------------------------------------------------
  // Test 1: Direct Supporting Evidence
  // -----------------------------------------------------------------------------
  logs.push('▶ Test 1: Direct Supporting Evidence directly establishing claim assertions');
try {
  const claim = 'RBI keeps policy repo rate unchanged at 6.50 percent in latest monetary policy meeting';
  const rawDoc = 'The Monetary Policy Committee decided by a majority of 5 to 1 to keep the policy repo rate unchanged at 6.50 percent.';
  const evidenceItem = {
    source_name: 'Reserve Bank of India',
    url: 'https://rbi.org.in/press/repo-rate-decision',
    published_date: '2024-10-09',
    raw_content: rawDoc,
    excerpt: rawDoc,
    trust_tier: 'TIER_1_OFFICIAL_GOV',
    domain: 'rbi.org.in'
  };

  const processed = processEvidenceItems([evidenceItem], claim);
  assert(processed.length === 1, 'Evidence item processed');
  assert(processed[0].claim_relationship === 'SUPPORTS_CLAIM', 'Item classified as SUPPORTS_CLAIM');
  assert(processed[0].stance === 'SUPPORTS', 'Stance is SUPPORTS');
  assert(processed[0].is_official === true, 'Source recognized as OFFICIAL_SOURCE');

  const verdict = synthesizeFallbackVerdict(claim, processed);
  assert(verdict.verdict === 'SUPPORTED', 'Direct evidence yields SUPPORTED verdict');
  assert(verdict.confidence.rating === 'HIGH', 'High confidence rating assigned');
  assert(verdict.confidence.score >= 0.85, 'Calibrated confidence score >= 0.85');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 2: Direct Contradictory Evidence
// -----------------------------------------------------------------------------
console.log('\n▶ Test 2: Direct Contradictory Evidence (Authoritative Debunk)');
try {
  const claim = 'Government of India is distributing free laptops to all students who passed class 10';
  const rawDoc = 'A message is circulating on social media claiming that the Government of India is providing free laptops to all students. This claim is FAKE. No such scheme is being operated by the central government.';
  const evidenceItem = {
    source_name: 'PIB Fact Check',
    url: 'https://factcheck.pib.gov.in/debunk-laptop-scheme',
    published_date: '2024-05-12',
    raw_content: rawDoc,
    excerpt: rawDoc,
    trust_tier: 'TIER_2_FACT_CHECKER',
    domain: 'factcheck.pib.gov.in'
  };

  const processed = processEvidenceItems([evidenceItem], claim);
  assert(processed[0].claim_relationship === 'CONTRADICTS_CLAIM', 'Item classified as CONTRADICTS_CLAIM');
  assert(processed[0].stance === 'REFUTES', 'Stance is REFUTES');

  const verdict = synthesizeFallbackVerdict(claim, processed);
  assert(verdict.verdict === 'FALSE', 'Contradictory evidence yields FALSE verdict');
  assert(verdict.action_risk.risk_level === 'HIGH', 'False claim produces HIGH action risk');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 3: General Context That Does NOT Establish Claim
// -----------------------------------------------------------------------------
console.log('\n▶ Test 3: General Context / Official Portal Existence (Distinguishing Credibility from Support)');
try {
  const claim = 'Ministry announced a new universal relief grant of Rs 25000 for all housewives';
  const generalDoc = 'National Portal of India provides access to government services and official portals such as india.gov.in for public inquiries.';
  const evidenceItem = {
    source_name: 'National Portal of India',
    url: 'https://india.gov.in/portal-services',
    published_date: '2024-01-01',
    raw_content: generalDoc,
    excerpt: generalDoc,
    trust_tier: 'TIER_1_OFFICIAL_GOV',
    domain: 'india.gov.in'
  };

  const processed = processEvidenceItems([evidenceItem], claim);
  assert(processed[0].is_official === true, 'Source recognized as official');
  assert(processed[0].claim_relationship === 'CONTEXT_ONLY', 'Official portal background classified as CONTEXT_ONLY');
  assert(processed[0].stance === 'CONTEXTUALIZES', 'Stance is CONTEXTUALIZES, NOT SUPPORTS');

  const verdict = synthesizeFallbackVerdict(claim, processed);
  assert(verdict.verdict === 'UNCONFIRMED', 'General context alone yields UNCONFIRMED, never Verified');
  assert(verdict.confidence.rating === 'LOW', 'Confidence rating is strictly LOW');
  assert(verdict.confidence.score <= 0.35, `Confidence score bounded <= 0.35 (actual: ${verdict.confidence.score})`);
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 4: Conflicting Sources
// -----------------------------------------------------------------------------
console.log('\n▶ Test 4: Conflicting Sources (One refuting, one providing context)');
try {
  const claim = 'State electricity board offers 50% discount on bill payments via telegram bot';
  const item1 = {
    source_name: 'State Discom Official Portal',
    url: 'https://discom.gov.in/guidelines',
    raw_content: 'Official electricity payments are accepted only via authorized banking channels.',
    excerpt: 'Official electricity payments are accepted only via authorized banking channels.',
    trust_tier: 'TIER_1_OFFICIAL_GOV'
  };
  const item2 = {
    source_name: 'Cyber Crime Police Advisory',
    url: 'https://cybercrime.gov.in/advisories/bot-scam',
    raw_content: 'Beware of fake Telegram bots offering electricity bill discounts. This is a phishing scam.',
    excerpt: 'Beware of fake Telegram bots offering electricity bill discounts. This is a phishing scam.',
    trust_tier: 'TIER_1_OFFICIAL_GOV'
  };

  const processed = processEvidenceItems([item1, item2], claim);
  const verdict = synthesizeFallbackVerdict(claim, processed);
  assert(verdict.verdict === 'FALSE', 'Direct refuting alert prevails over neutral context');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 5: Duplicate Sources (Deduplication & Independent Corroboration)
// -----------------------------------------------------------------------------
console.log('\n▶ Test 5: Duplicate Sources (Same domain syndicated across multiple URLs)');
try {
  const items = [
    { source_name: 'News Outlet A', url: 'https://news.example.com/article/1', trust_tier: 'TIER_3_GENERAL_NEWS' },
    { source_name: 'News Outlet A', url: 'https://news.example.com/article/1?utm=rss', trust_tier: 'TIER_3_GENERAL_NEWS' },
    { source_name: 'News Outlet A', url: 'https://news.example.com/amp/article/1', trust_tier: 'TIER_3_GENERAL_NEWS' }
  ];

  const independent = deduplicateByDomain(items);
  assert(independent.length === 1, `Deduplicated identical domain copies into 1 independent source (actual: ${independent.length})`);
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 6: Outdated Information
// -----------------------------------------------------------------------------
console.log('\n▶ Test 6: Outdated / Superseded Scheme Check');
try {
  assert(isTimeRelevant('2024-05-01') === true, 'Recent date (2024) is time relevant');
  assert(isTimeRelevant('2018-02-15') === false, 'Older date (2018) is not time relevant for current year');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 7: No Search Results (Search absence is NOT proof of falsity)
// -----------------------------------------------------------------------------
console.log('\n▶ Test 7: No Search Results (Empty retrieval yields UNCONFIRMED)');
try {
  const claim = 'Obscure municipal committee passed a resolution on local park timing yesterday';
  const verdict = buildUnconfirmedPayload(claim, { providers_status: [{ provider: 'curated_kb', status: 'EMPTY' }] });

  assert(verdict.verdict === 'UNCONFIRMED', 'Absence of evidence yields UNCONFIRMED, never FALSE');
  assert(verdict.confidence.rating === 'LOW', 'Confidence is LOW');
  assert(validateVerdictPayload(verdict).valid === true, 'Unconfirmed payload passes schema validation');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 8: Search Provider Failure
// -----------------------------------------------------------------------------
console.log('\n▶ Test 8: Search Provider Failure / Offline Provider Handling');
try {
  const claim = 'Some newly minted crypto token endorsed by central bank';
  const retrievalMetadata = {
    providers_status: [
      { provider: 'web_search', status: 'UNAVAILABLE', reason: 'API key not configured' },
      { provider: 'google_factcheck', status: 'UNAVAILABLE', reason: 'Quota exceeded' }
    ]
  };

  const verdict = buildUnconfirmedPayload(claim, retrievalMetadata);
  assert(verdict.verdict === 'UNCONFIRMED', 'Provider unavailability returns UNCONFIRMED without fabricating');
  assert(verdict.confidence.score <= 0.35, 'Confidence remains conservative');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 9: THE SCHOLARSHIP REGRESSION TEST (Requirement 8)
// -----------------------------------------------------------------------------
console.log('\n▶ Test 9: Scholarship Forward Regression Test');
try {
  const scholarshipClaim = 'The government is giving every college student ₹50,000 under a new scholarship scheme starting next month. Students must register before 15 November using the official portal.';

  // 1. Verify assertion decomposition
  const assertions = extractAssertions(scholarshipClaim);
  assert(assertions.length >= 3, `Extracted ${assertions.length} atomic assertions individually`);
  assert(assertions.some(a => a.type === 'FINANCIAL_BENEFIT'), 'Identified ₹50,000 financial benefit assertion');
  assert(assertions.some(a => a.type === 'ELIGIBILITY'), 'Identified "every college student" eligibility assertion');
  assert(assertions.some(a => a.type === 'DEADLINE'), 'Identified 15 November deadline assertion');
  assert(assertions.some(a => a.type === 'ACTION_CHANNEL'), 'Identified official portal registration assertion');

  // 2. Simulate the exact KB document retrieved in the previous bug:
  // (PIB debunk of fake laptops which mentioned scholarships.gov.in as general advice)
  const kbLaptopDebunk = {
    source_name: 'Press Information Bureau - Fact Check',
    url: 'https://scholarships.gov.in',
    published_date: '2023-08-10',
    trust_tier: 'TIER_1_OFFICIAL_GOV',
    raw_content: 'The Press Information Bureau cautions citizens that the Central Government runs no scheme titled PM Free Laptop Distribution Scheme. Official academic support and scholarship programs are managed strictly through verified domains such as scholarships.gov.in. Citizens are advised not to share personal credentials on unverified third-party websites.',
    domain: 'scholarships.gov.in'
  };

  const processedEvidence = processEvidenceItems([kbLaptopDebunk], scholarshipClaim);
  assert(processedEvidence.length === 1, 'Evidence processed from KB');
  assert(processedEvidence[0].is_official === true, 'Source correctly identified as official domain (.gov.in)');
  assert(processedEvidence[0].claim_relationship === 'CONTEXT_ONLY', 'PIB portal mention strictly classified as CONTEXT_ONLY');
  assert(processedEvidence[0].stance === 'CONTEXTUALIZES', 'Stance is CONTEXTUALIZES, NOT SUPPORTS');

  // 3. Synthesize verdict
  const verdict = synthesizeFallbackVerdict(scholarshipClaim, processedEvidence);

  // Assert critical requirements:
  assert(verdict.verdict !== 'SUPPORTED', 'CRITICAL: Must NOT be marked SUPPORTED ("Verified Authentic")');
  assert(verdict.verdict === 'UNCONFIRMED', 'Verdict is strictly UNCONFIRMED');
  assert(verdict.confidence.rating === 'LOW', 'Confidence rating is LOW, NOT HIGH');
  assert(verdict.confidence.score <= 0.35, `Confidence score is capped at <= 0.35 (actual: ${verdict.confidence.score}, NEVER 94%)`);
  assert(verdict.plain_explanation.includes('scholarships.gov.in') || verdict.plain_explanation.includes('Press Information Bureau'), 'Explanation explains institutional portal context');
  assert(verdict.plain_explanation.toLowerCase().includes('not confirmed') || verdict.plain_explanation.toLowerCase().includes('could not be confirmed'), 'Explanation clarifies claim is unconfirmed');

  const validation = validateVerdictPayload(verdict);
  assert(validation.valid === true, 'Verdict payload strictly adheres to verdict.schema.json');
} catch (e) {
  console.error(e);
  failCount++;
}

// -----------------------------------------------------------------------------
// Test 10: Fabricated or Invalid Source Metadata Validation
// -----------------------------------------------------------------------------
console.log('\n▶ Test 10: Quote Validation & URL Sanitation');
try {
  const rawDoc = 'The Ministry of Health announced new immunization guidelines across all districts in April.';
  const fabricatedQuote = 'The Ministry of Health declared that purple quartz crystals cure cancer.';
  const exactQuote = 'The Ministry of Health announced new immunization guidelines';

  assert(validateExactQuote(fabricatedQuote, rawDoc) === false, 'Fabricated quote fails strict substring validation');
  assert(validateExactQuote(exactQuote, rawDoc) === true, 'Exact quote passes strict substring validation');

  // Verbatim extraction fallback
  const verbatim = extractVerbatimExcerpt(rawDoc, 'immunization');
  assert(rawDoc.includes(verbatim), 'Fallback extracted verbatim substring from original document');

  // URL sanitation: non-http/javascript: URIs filtered
  const invalidItems = [
    { url: 'javascript:alert(1)', raw_content: 'Some malicious payload' },
    { url: 'file:///etc/passwd', raw_content: 'Local file' },
    { url: 'https://valid-registry.gov.in/notice', raw_content: 'Valid official notice' }
  ];
  const sanitized = processEvidenceItems(invalidItems, 'test');
  assert(sanitized.length === 1 && sanitized[0].url.startsWith('https://'), 'Non-HTTP(S) URIs cleanly filtered');
} catch (e) {
  console.error(e);
  failCount++;
}

  logs.push('================================================================');
  logs.push(`Results: ${passCount} Passed, ${failCount} Failed`);
  logs.push('================================================================');

  if (failCount === 0) {
    logs.push('🎉 ALL 10 GROUNDING & VERDICT ACCURACY TESTS PASSED PERFECTLY!');
  }

  return { passCount, failCount, logs, success: failCount === 0 };
}

// If executed directly from CLI
if (process.argv[1] && process.argv[1].includes('grounding-and-verdict.test.js')) {
  const result = runGroundingTests();
  result.logs.forEach(l => console.log(l));
  process.exit(result.failCount > 0 ? 1 : 0);
}

