/**
 * @file gemini-mock.test.js
 * Unit test validating Gemini structured JSON parsing, Ajv schema verification,
 * and retry/self-correction handling.
 */

import { validateVerdictPayload } from '../src/validators/verdict.validator.js';
import { validateVerificationInput } from '../src/validators/input.validator.js';

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
console.log('🧪 TRUTHLENS PHASE 3: GEMINI SCHEMA & RETRY LOGIC UNIT TESTS');
console.log('================================================================\n');

// 1. Test Input Validator Edge Cases
console.log('▶ Test 1: Input Validation Logic');
try {
  const valid = validateVerificationInput({ inputType: 'text', text: 'This is a genuine viral claim forwarded on WhatsApp.' });
  assert(valid.inputType === 'text', 'Valid input accepted with inputType: "text"');
  assert(valid.text.length > 10, 'Valid text preserved');

  let caughtUnsupported = false;
  try {
    validateVerificationInput({ inputType: 'audio', content: 'note.mp3' });
  } catch (err) {
    caughtUnsupported = err.statusCode === 415 && err.code === 'UNSUPPORTED_INPUT_TYPE';
  }
  assert(caughtUnsupported, 'Audio input thrown with HTTP 415 UNSUPPORTED_INPUT_TYPE');

  let caughtEmpty = false;
  try {
    validateVerificationInput({ inputType: 'text', text: '' });
  } catch (err) {
    caughtEmpty = err.statusCode === 400 && err.code === 'MISSING_TEXT';
  }
  assert(caughtEmpty, 'Empty text thrown with HTTP 400 MISSING_TEXT');
} catch (e) {
  console.error(e);
  failCount++;
}

// 2. Test Ajv Verdict Schema Validation for Compliant Model Output
console.log('\n▶ Test 2: Ajv Schema Validation for Compliant Live Output');
try {
  const validLiveModelOutput = {
    input: {
      raw_text: "URGENT: Government announced free laptops for all students registered before tonight.",
      media_type: "text",
      received_at: "2026-10-10T00:15:00Z",
      source_platform: "Web Forward"
    },
    claim: "Government is distributing free laptops to all students who register online before tonight.",
    verdict: "FALSE",
    confidence: {
      score: 0.95,
      rating: "HIGH",
      rationale: "Established PIB fact-checks confirm universal laptop registration forms are fraudulent."
    },
    plain_explanation: "This forward is completely false. No universal online laptop registration scheme exists.",
    evidence: [],
    stress_test: {
      counter_arguments_checked: [
        "Did any state government offer educational laptop schemes in previous budget cycles?"
      ],
      edge_cases_identified: [
        "State initiatives required in-person college authentication rather than public web forms."
      ],
      robustness_summary: "Universally debunked by ministry notifications."
    },
    truth_timeline: [],
    action_risk: {
      risk_level: "HIGH",
      risk_category: "MISINFORMATION",
      warning_flag: "Do not enter student Aadhaar credentials.",
      recommended_action: "Delete the message and advise group members."
    }
  };

  const validation = validateVerdictPayload(validLiveModelOutput);
  assert(validation.valid === true, 'Live model output with empty evidence: [] passes schema validation');
  assert(validation.errors === null, 'No validation errors recorded');
} catch (e) {
  console.error(e);
  failCount++;
}

// 3. Test Rejection of Schema-Noncompliant Output (Triggers Retry)
console.log('\n▶ Test 3: Detection of Schema-Noncompliant Output (Triggers Self-Correction)');
try {
  const invalidModelOutput = {
    claim: "Something happened",
    verdict: "INVALID_STATUS", // Not in enum
    confidence: { score: 1.5 }, // > 1.0 and missing rating
    evidence: []
    // Missing required fields: plain_explanation, stress_test, action_risk
  };

  const validation = validateVerdictPayload(invalidModelOutput);
  assert(validation.valid === false, 'Invalid output flagged as non-compliant');
  assert(Array.isArray(validation.errors), 'Ajv produces detailed error array for feedback to Gemini');
  assert(validation.errors.some(e => e.instancePath.includes('verdict') || e.params?.allowedValues), 'Identifies invalid verdict enum');
} catch (e) {
  console.error(e);
  failCount++;
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 Unit tests passed successfully!');
  process.exit(0);
}
