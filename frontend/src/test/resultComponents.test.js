/**
 * @file resultComponents.test.js
 * Automated test suite for TruthLens Phase 2 Verdict Contract & Resilience.
 * 
 * Tests:
 * 1. All 3 Canonical Fixtures (false_health_claim, outdated_gov_scheme, suspicious_kyc_message)
 * 2. Incomplete Data Scenarios (empty evidence, empty timeline, missing optional fields)
 * 3. Mixed Verification Path & Conflict Detection Scenario
 * 4. Missing Confidence / Explanation / Source URL / Action Risk Scenario
 * 5. Malformed, Null, and Out-of-Range Data Scenario
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  normalizeVerdictContract, 
  normalizeVerdictStatus, 
  normalizeEvidenceRelation,
  normalizeRiskLevel,
  parseValidConfidence,
  safeFormatDate,
  VERDICT_LABELS 
} from '../contracts/verdictContract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFixture(relPath) {
  const absPath = path.resolve(__dirname, relPath);
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('🧪 TRUTHLENS PHASE 2: VERDICT CONTRACT & FIXTURE TEST SUITE');
console.log('================================================================\n');

// ------------------------------------------------------------------------------
// TEST SUITE 1: Canonical Fixtures Normalization
// ------------------------------------------------------------------------------
console.log('▶ Test Suite 1: Three Canonical Fixtures');

// Fixture 1: false_health_claim
try {
  const healthFixture = loadFixture('../fixtures/false_health_claim.json');
  const contract1 = normalizeVerdictContract(healthFixture, { mode: 'mock' });
  
  assert(contract1.verdict.status === 'FALSE', 'Health fixture maps to FALSE status');
  assert(contract1.verdict.label === 'False / Fabricated', 'Health fixture receives human-readable label');
  assert(contract1.verdict.confidence === 0.99, 'Health fixture preserves 0.99 confidence');
  assert(contract1.evidence.length === 2, 'Health fixture has exactly 2 evidence items');
  assert(contract1.evidence.every(e => e.relation === 'CONTRADICTING'), 'Health fixture evidence stances map to CONTRADICTING');
  assert(contract1.stressTest.paths.length > 0, 'Health fixture generates adversarial verification paths');
  assert(contract1.truthTimeline.length === 3, 'Health fixture contains 3 chronological events');
  assert(contract1.actionRisk.level === 'CRITICAL', 'Health fixture maps risk to CRITICAL');
  assert(contract1.actionRisk.category === 'HEALTH_HAZARD', 'Health fixture category preserved');
} catch (e) {
  console.error('Error in Fixture 1 test:', e);
  failCount++;
}

// Fixture 2: outdated_gov_scheme
try {
  const govFixture = loadFixture('../fixtures/outdated_gov_scheme.json');
  const contract2 = normalizeVerdictContract(govFixture, { mode: 'mock' });

  assert(contract2.verdict.status === 'OUTDATED', 'Gov fixture maps to OUTDATED status');
  assert(contract2.verdict.confidence === 0.96, 'Gov fixture preserves 0.96 confidence');
  assert(contract2.evidence.length === 2, 'Gov fixture preserves 2 evidence citations');
  assert(contract2.evidence.some(e => e.relation === 'CONTRADICTING'), 'Gov fixture has refuting evidence');
  assert(contract2.evidence.some(e => e.relation === 'CONTEXTUAL'), 'Gov fixture has contextual evidence');
  assert(contract2.truthTimeline.length === 3, 'Gov fixture has 3 timeline events');
  assert(contract2.actionRisk.level === 'HIGH', 'Gov fixture maps risk to HIGH');
} catch (e) {
  console.error('Error in Fixture 2 test:', e);
  failCount++;
}

// Fixture 3: suspicious_kyc_message
try {
  const kycFixture = loadFixture('../fixtures/suspicious_kyc_message.json');
  const contract3 = normalizeVerdictContract(kycFixture, { mode: 'mock' });

  assert(contract3.verdict.status === 'FALSE', 'KYC fixture maps to FALSE status');
  assert(contract3.input.sourcePlatform === 'SMS', 'KYC fixture input origin is SMS');
  assert(contract3.actionRisk.level === 'CRITICAL', 'KYC fixture has CRITICAL risk level');
  assert(contract3.actionRisk.category === 'PHISHING', 'KYC fixture category is PHISHING');
  assert(contract3.actionRisk.warningFlag.length > 0, 'KYC fixture contains warning flag banner');
  assert(contract3.actionRisk.safetyAdvice.length > 0, 'KYC fixture contains recommended safety steps');
} catch (e) {
  console.error('Error in Fixture 3 test:', e);
  failCount++;
}

// ------------------------------------------------------------------------------
// TEST SUITE 2: Incomplete Data Scenarios
// ------------------------------------------------------------------------------
console.log('\n▶ Test Suite 2: Incomplete & Empty Data Resilience');

try {
  // Completely empty input payload
  const emptyContract = normalizeVerdictContract({});
  assert(emptyContract.verdict.status === 'CANNOT_CONFIRM', 'Empty payload falls back to CANNOT_CONFIRM');
  assert(emptyContract.verdict.confidence === null, 'Missing confidence returns null without crashing');
  assert(Array.isArray(emptyContract.evidence) && emptyContract.evidence.length === 0, 'Evidence defaults to empty array');
  assert(Array.isArray(emptyContract.truthTimeline) && emptyContract.truthTimeline.length === 0, 'Timeline defaults to empty array');
  assert(emptyContract.actionRisk === null, 'Missing action risk defaults to null gracefully');
  assert(emptyContract.input.extractedClaim === '', 'Missing claim is empty string, not undefined');
} catch (e) {
  console.error('Error in empty payload test:', e);
  failCount++;
}

// ------------------------------------------------------------------------------
// TEST SUITE 3: Mixed Conflicting Verification Paths
// ------------------------------------------------------------------------------
console.log('\n▶ Test Suite 3: Mixed Verification Paths & Conflict Detection');

try {
  const mixedData = {
    claim: 'Solar storms will shut down all wireless cellular towers tomorrow.',
    verdict: 'PARTLY_TRUE',
    confidence: { score: 0.65, rating: 'MEDIUM' },
    stress_test: {
      paths: [
        { name: 'Space Weather Prediction Center (NOAA)', status: 'SUPPORT', note: 'Moderate G2 storm detected.' },
        { name: 'Telecom Infrastructure Audit', status: 'CONTRADICTION', note: 'Consumer cell networks are shielded against G2 storms.' },
        { name: 'Local Radio Check', status: 'INCONCLUSIVE', note: 'HF propagation affected only at poles.' }
      ]
    }
  };

  const mixedContract = normalizeVerdictContract(mixedData);
  assert(mixedContract.verdict.status === 'PARTLY_SUPPORTED', 'PARTLY_TRUE maps to PARTLY_SUPPORTED');
  assert(mixedContract.stressTest.paths.length === 3, 'All 3 paths preserved');
  assert(mixedContract.stressTest.conflictNote !== null, 'Divergent paths automatically trigger conflict note');
  assert(mixedContract.stressTest.conflictNote.includes('divergent'), 'Conflict note explains disagreement between paths');
} catch (e) {
  console.error('Error in mixed path test:', e);
  failCount++;
}

// ------------------------------------------------------------------------------
// TEST SUITE 4: Malformed, Null, and Out-of-Range Field Resilience
// ------------------------------------------------------------------------------
console.log('\n▶ Test Suite 4: Malformed, Null, and Out-of-Range Field Resilience');

try {
  assert(parseValidConfidence(-0.5) === null, 'Negative confidence rejected (-0.5 -> null)');
  assert(parseValidConfidence(1.25) === null, 'Confidence > 1.0 rejected (1.25 -> null)');
  assert(parseValidConfidence('not-a-number') === null, 'Non-numeric confidence rejected -> null');
  assert(parseValidConfidence(0.85) === 0.85, 'Valid confidence accepted (0.85)');

  assert(normalizeVerdictStatus('UNKNOWN_VALUE') === 'CANNOT_CONFIRM', 'Unknown verdict string maps to CANNOT_CONFIRM');
  assert(normalizeVerdictStatus(null) === 'CANNOT_CONFIRM', 'Null verdict maps to CANNOT_CONFIRM');

  assert(normalizeRiskLevel('INVALID') === 'UNKNOWN', 'Invalid risk level maps to UNKNOWN');
  assert(normalizeRiskLevel(undefined) === 'UNKNOWN', 'Undefined risk level maps to UNKNOWN');

  assert(safeFormatDate('invalid-date-string') === 'invalid-date-string', 'Malformed date string does not throw error');
  assert(safeFormatDate(null) === '', 'Null date returns empty string');

  // Payload with broken items in arrays
  const brokenPayload = {
    verdict: 'SUPPORTED',
    confidence: 'invalid-string',
    evidence: [null, undefined, { source_name: 'NASA', url: 'https://nasa.gov' }],
    truth_timeline: [{ date: '2025-01-01', event: 'Event A' }, null],
    action_risk: { level: 'UNRECOGNIZED', requestedAction: '' }
  };

  const cleanContract = normalizeVerdictContract(brokenPayload);
  assert(cleanContract.verdict.status === 'VERIFIED', 'SUPPORTED maps to VERIFIED');
  assert(cleanContract.verdict.confidence === null, 'Invalid confidence in object handled safely');
  assert(cleanContract.evidence.length === 1, 'Null evidence items filtered out safely');
  assert(cleanContract.truthTimeline.length === 1, 'Null timeline items filtered out safely');
} catch (e) {
  console.error('Error in malformed data test:', e);
  failCount++;
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All test scenarios passed successfully!');
  process.exit(0);
}
