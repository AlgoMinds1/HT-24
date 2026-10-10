/**
 * @file groq-service.test.js
 * Unit test validating Groq verification logic, Ajv schema adherence,
 * unconfirmed epistemic constraints, and fallback synthesis.
 */

import { buildUnconfirmedPayload, synthesizeFallbackVerdict } from '../src/services/groq.service.js';
import { validateVerdictPayload } from '../src/validators/verdict.validator.js';

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
console.log('🧪 TRUTHLENS: GROQ SERVICE & CONTRACT CONFORMANCE TESTS');
console.log('================================================================\n');

// 1. Test UNCONFIRMED payload schema adherence
console.log('▶ Test 1: buildUnconfirmedPayload adherence to verdict.schema.json');
try {
  const unconfirmed = buildUnconfirmedPayload('Aliens landed in Times Square yesterday and handed out gold bars');
  const validation = validateVerdictPayload(unconfirmed);
  assert(validation.valid === true, 'Unconfirmed payload passes Ajv verdict schema validation');
  assert(unconfirmed.verdict === 'UNCONFIRMED', 'Verdict is strictly UNCONFIRMED');
  assert(unconfirmed.confidence.score <= 0.5, 'Unconfirmed confidence score is low');
  assert(Array.isArray(unconfirmed.evidence) && unconfirmed.evidence.length === 0, 'Unconfirmed has empty evidence array');
  assert(unconfirmed.action_risk.risk_level === 'MODERATE', 'Appropriate risk level assigned');
} catch (e) {
  console.error(e);
  failCount++;
}

// 2. Test Refuting Evidence Fallback Synthesis
console.log('\n▶ Test 2: synthesizeFallbackVerdict with REFUTING evidence');
try {
  const refutingEvidence = [
    {
      source_name: 'PIB Fact Check',
      url: 'https://factcheck.pib.gov.in/debunk-fake-laptop',
      stance: 'REFUTES',
      excerpt: 'The Ministry of Education has not launched any scheme distributing free laptops via WhatsApp links.',
      reliability_score: 0.98
    }
  ];
  const verdict = synthesizeFallbackVerdict('Free laptops for all students under PM scheme', refutingEvidence);
  const validation = validateVerdictPayload(verdict);
  assert(validation.valid === true, 'Refuting fallback payload passes Ajv verdict schema');
  assert(verdict.verdict === 'FALSE', 'Refuting evidence triggers FALSE verdict');
  assert(verdict.action_risk.risk_level === 'HIGH', 'False claim produces HIGH risk level');
} catch (e) {
  console.error(e);
  failCount++;
}

// 3. Test Supporting Evidence Fallback Synthesis
console.log('\n▶ Test 3: synthesizeFallbackVerdict with SUPPORTING evidence');
try {
  const supportingEvidence = [
    {
      source_name: 'Reserve Bank of India',
      url: 'https://rbi.org.in/press/repo-rate-decision',
      stance: 'SUPPORTS',
      excerpt: 'The Monetary Policy Committee decided to keep the policy repo rate unchanged at 6.50 percent.',
      reliability_score: 0.99
    }
  ];
  const verdict = synthesizeFallbackVerdict('RBI leaves repo rate unchanged at 6.5%', supportingEvidence);
  const validation = validateVerdictPayload(verdict);
  assert(validation.valid === true, 'Supporting fallback payload passes Ajv verdict schema');
  assert(verdict.verdict === 'SUPPORTED', 'Supporting evidence triggers SUPPORTED verdict');
  assert(verdict.confidence.rating === 'HIGH', 'Supporting evidence produces HIGH confidence');
} catch (e) {
  console.error(e);
  failCount++;
}

console.log('\n================================================================');
console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL GROQ SERVICE TESTS PASSED PERFECTLY!\n');
}
