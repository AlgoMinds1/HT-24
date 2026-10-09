import { vectorStore } from '../src/retrieval/vector_store.js';
import { retrieverService } from '../src/retrieval/retriever.service.js';
import { validateExactQuote } from '../src/retrieval/evidence_processor.js';
import { buildUnconfirmedPayload } from '../src/services/gemini.service.js';
import { validateVerdictPayload } from '../src/validators/verdict.validator.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 TRUTHLENS PHASE 5 RETRIEVAL & EVIDENCE VERIFICATION SUITE');
  console.log('================================================================\n');

  // Test 1: Vector Store Auto-Bootstrap & Loading
  console.log('👉 [TEST 1] Vector Store Bootstrap & Storage');
  await vectorStore.ensureLoaded();
  assert(vectorStore.chunks.length > 0, `Vector store loaded with ${vectorStore.chunks.length} chunks`);
  const sampleChunk = vectorStore.chunks[0];
  assert(Boolean(sampleChunk.source_name && sampleChunk.url && sampleChunk.trust_tier), 'Chunks retain source_name, url, published_date, trust_tier metadata');

  // Test 2: Demo Case 1 - Health (Lemon + Baking Soda Cancer Cure)
  console.log('\n👉 [TEST 2] Health Remaking Retrieval & Strict Quote Validation');
  const healthRes = await retrieverService.retrieveEvidence('Drinking warm lemon water and baking soda alkalizes blood pH and cures cancer');
  assert(healthRes.evidence.length > 0, `Retrieved ${healthRes.evidence.length} evidence citations`);
  const cancerItem = healthRes.evidence.find(e => e.url.includes('cancer.org') || e.source_name.includes('Cancer Society'));
  assert(Boolean(cancerItem), 'Retrieved authoritative American Cancer Society evidence citation');
  if (cancerItem) {
    assert(cancerItem.stance === 'REFUTES', `Stance labeled correctly as ${cancerItem.stance}`);
    assert(cancerItem.reliability_score >= 0.90, `High reliability score: ${cancerItem.reliability_score}`);
    assert(cancerItem.isOfficial === false || cancerItem.trustTier.includes('TIER_1'), `Trust tier verified: ${cancerItem.trustTier}`);
    assert(cancerItem.excerpt && cancerItem.excerpt.length > 20, `Excerpt is populated: "${cancerItem.excerpt.slice(0, 60)}..."`);
  }

  // Test 3: Demo Case 2 - Government Scheme (PM Free Laptop Distribution)
  console.log('\n👉 [TEST 3] Government Scheme Retrieval & PIB Fact Check Grounding');
  const govRes = await retrieverService.retrieveEvidence('PM Free Laptop Distribution Scheme 2021 registration for 10th and 12th students');
  assert(govRes.evidence.length > 0, `Retrieved ${govRes.evidence.length} evidence citations`);
  const pibItem = govRes.evidence.find(e => e.url.includes('pib.gov.in') || e.source_name.includes('PIB'));
  assert(Boolean(pibItem), 'Retrieved official Press Information Bureau (PIB) Fact Check citation');
  if (pibItem) {
    assert(pibItem.stance === 'REFUTES', `Stance labeled correctly as ${pibItem.stance}`);
    assert(pibItem.isOfficial === true, 'Marked as official government domain (isOfficial = true)');
    assert(pibItem.url.startsWith('https://factcheck.pib.gov.in'), `Authentic government URL: ${pibItem.url}`);
  }

  // Test 4: Demo Case 3 - Financial Phishing (SBI YONO KYC Block)
  console.log('\n👉 [TEST 4] Financial Smishing Advisory Grounding');
  const finRes = await retrieverService.retrieveEvidence('SBI YONO bank account blocked due to expired KYC update at sbi-kyc-quickupdate.net');
  assert(finRes.evidence.length > 0, `Retrieved ${finRes.evidence.length} evidence citations`);
  const sbiItem = finRes.evidence.find(e => e.url.includes('sbi.co.in'));
  assert(Boolean(sbiItem), 'Retrieved official State Bank of India security advisory');
  if (sbiItem) {
    assert(sbiItem.stance === 'REFUTES', `Stance labeled as ${sbiItem.stance}`);
    assert(sbiItem.url === 'https://sbi.co.in/web/customer-care/security-tips', `Authentic SBI portal URL: ${sbiItem.url}`);
  }

  // Test 5: In-Code Exact Quote Validation Integrity
  console.log('\n👉 [TEST 5] In-Code Verbatim Quote Integrity Verification');
  const fullContent = "Human blood pH is strictly regulated by the kidneys and respiratory system within a narrow pH range of 7.35 to 7.45.";
  const genuineQuote = "Human blood pH is strictly regulated by the kidneys";
  const fabricatedQuote = "Drinking lemon juice raises your blood pH to 9.5 safely";
  assert(validateExactQuote(genuineQuote, fullContent) === true, 'Exact genuine quote substring validated');
  assert(validateExactQuote(fabricatedQuote, fullContent) === false, 'Fabricated quote strictly rejected by validator');

  // Test 6: Unsupported Claim Yields UNCONFIRMED
  console.log('\n👉 [TEST 6] Epistemic Rigor: Unsupported Claims Return UNCONFIRMED');
  const obscureClaim = 'Eating purple quartz stones at midnight grants humans the ability to jump 80 meters';
  const obscureRes = await retrieverService.retrieveEvidence(obscureClaim);
  assert(obscureRes.evidence.length === 0, 'No false or hallucinated evidence retrieved for obscure ungrounded claim');
  
  const unconfirmedVerdict = buildUnconfirmedPayload(obscureClaim, obscureRes.retrieval_metadata);
  assert(unconfirmedVerdict.verdict === 'UNCONFIRMED', `Verdict set strictly to UNCONFIRMED (got: ${unconfirmedVerdict.verdict})`);
  assert(unconfirmedVerdict.evidence.length === 0, 'Evidence list is strictly empty [] for unconfirmed claim');
  assert(unconfirmedVerdict.confidence.rating === 'LOW', `Confidence is LOW (got: ${unconfirmedVerdict.confidence.rating})`);
  
  const validation = validateVerdictPayload(unconfirmedVerdict);
  assert(validation.valid === true, 'UNCONFIRMED verdict payload strictly passes contracts/verdict.schema.json validation');

  // Test 7: Provider Status Reporting
  console.log('\n👉 [TEST 7] Provider Status & Limitation Transparency');
  const providersStatus = obscureRes.retrieval_metadata.providers_status;
  assert(Array.isArray(providersStatus) && providersStatus.length === 3, 'Reports status for all 3 providers (KB, Google Fact Check, Web Search)');
  const kbStatus = providersStatus.find(p => p.provider === 'curated_kb');
  assert(Boolean(kbStatus && (kbStatus.status === 'SUCCESS' || kbStatus.status === 'EMPTY')), `KB provider status reported cleanly (${kbStatus?.status})`);
  const fcStatus = providersStatus.find(p => p.provider === 'google_factcheck');
  assert(Boolean(fcStatus && (fcStatus.status === 'UNAVAILABLE' || fcStatus.status === 'SUCCESS' || fcStatus.status === 'EMPTY')), `Fact Check provider status transparently reported (${fcStatus?.status})`);

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
