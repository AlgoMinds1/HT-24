/**
 * @file test-verify.js
 * Comprehensive automated verification script for TruthLens Backend Phase 3.
 * 
 * Tests:
 * 1. Health check endpoint (GET /api/health)
 * 2. Input validation & rejection of unsupported media types (image, audio, pdf, url)
 * 3. Validation of empty or too short text
 * 4. 5 diverse text claim scenarios evaluated against POST /api/verify
 * 5. Ajv schema compliance for all returned verdicts
 */

import { validateVerdictPayload } from '../src/validators/verdict.validator.js';
import { env } from '../src/config/env.js';

const BASE_URL = `http://localhost:${env.PORT}/api`;

const TEST_SCENARIOS = [
  {
    category: 'Government Scheme / Direct Subsidy Forward',
    text: 'Good news! Under PM Free Solar Rooftop Yojana 2026, government is giving Rs. 50,000 direct cash subsidy to all electricity bill payers. Register at www.pmsolar-free-registration.net before 30th October to claim.'
  },
  {
    category: 'Health / Alternative Medical Remedy Forward',
    text: 'URGENT HEALTH ADVISORY: Drinking boiled garlic water with ginger and raw honey three times daily completely removes kidney stones and cures chronic kidney disease in 7 days without surgery. Big Pharma will not tell you this!'
  },
  {
    category: 'Educational / Exam Postponement Announcement',
    text: 'Breaking notification from Ministry of Education: All central university semester exams scheduled for May 2026 have been indefinitely postponed due to upcoming state elections.'
  },
  {
    category: 'Numerical / Economic Statistical Claim',
    text: 'According to official world bank reports, India has achieved 48% GDP growth rate in Q1 2026, making it the fastest expanding economy in world history.'
  },
  {
    category: 'Urgent Action / Utility Disconnection Scam',
    text: 'URGENT NOTICE: Dear customer, your electricity power connection will be permanently disconnected tonight at 9:30 PM due to unpaid bill update. Contact our official electricity officer immediately at 9876543210.'
  }
];

let passCount = 0;
let failCount = 0;

function logResult(success, message) {
  if (success) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TRUTHLENS PHASE 3: BACKEND & LIVE VERIFICATION TEST SUITE');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log(`   Gemini Key Detected: ${env.hasGeminiKey ? 'YES' : 'NO'}`);
  console.log('================================================================\n');

  // ----------------------------------------------------------------------------
  // SUITE 1: Health Check Endpoint
  // ----------------------------------------------------------------------------
  console.log('▶ Test Suite 1: Health Check Endpoint');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    logResult(res.status === 200, `GET /api/health returned HTTP 200 (status: ${data.status})`);
    logResult(data.status === 'ok', 'Health response contains { status: "ok" }');
    logResult(!data.apiKey && !data.key, 'Health check does not expose sensitive secrets');
  } catch (err) {
    logResult(false, `Health check request failed: ${err.message}. Is backend running on port ${env.PORT}?`);
  }

  // ----------------------------------------------------------------------------
  // SUITE 2: Validation of Unsupported Input Types
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 2: Rejection of Unsupported Input Types (Phase 3 Text-Only)');
  const unsupportedTypes = ['image', 'audio', 'pdf', 'url'];

  for (const type of unsupportedTypes) {
    try {
      const res = await fetch(`${BASE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputType: type, content: 'sample-attachment.dat' })
      });
      const data = await res.json();
      logResult(res.status === 415, `Rejected inputType="${type}" with HTTP 415 Unsupported Media Type`);
      logResult(data.error?.code === 'UNSUPPORTED_INPUT_TYPE', `Error code is UNSUPPORTED_INPUT_TYPE for ${type}`);
    } catch (err) {
      logResult(false, `Request for type ${type} failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------------------------------
  // SUITE 3: Validation of Empty / Invalid Text Requests
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 3: Input Body Validation (Empty/Short/Malformed)');
  try {
    const resEmpty = await fetch(`${BASE_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputType: 'text', text: '   ' })
    });
    logResult(resEmpty.status === 400, 'Empty/whitespace text rejected with HTTP 400 Bad Request');

    const resShort = await fetch(`${BASE_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputType: 'text', text: 'too short' })
    });
    logResult(resShort.status === 400, 'Text under 10 chars rejected with HTTP 400 Bad Request');
  } catch (err) {
    logResult(false, `Validation tests failed: ${err.message}`);
  }

  // ----------------------------------------------------------------------------
  // SUITE 4: 5 Diverse Text Claims Verification
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 4: Five Text Claim Verification Scenarios');

  if (!env.hasGeminiKey) {
    console.log('  ⚠️ GEMINI_API_KEY is not set or is using placeholder in backend/.env.');
    console.log('  👉 Skipping live model calls. (Set GEMINI_API_KEY to run live calls)');
  } else {
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const scenario = TEST_SCENARIOS[i];
      console.log(`\n  Scenario ${i + 1}: [${scenario.category}]`);
      console.log(`  Claim text: "${scenario.text.substring(0, 75)}..."`);

      try {
        const res = await fetch(`${BASE_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputType: 'text', text: scenario.text })
        });

        const data = await res.json();
        const is200 = res.status === 200;
        logResult(is200, `HTTP status is ${res.status}`);

        if (is200) {
          const schemaValidation = validateVerdictPayload(data);
          logResult(schemaValidation.valid, 'Verdict response passes contracts/verdict.schema.json');
          if (!schemaValidation.valid) {
            console.error('    Ajv validation errors:', schemaValidation.errors);
          }

          logResult(Array.isArray(data.evidence), 'Evidence is an array');
          logResult(data.evidence.length === 0, 'Evidence does not hallucinate fake citations (length = 0)');
          logResult(data.verdict && typeof data.verdict === 'string', `Verdict status is [${data.verdict}]`);
          logResult(data.action_risk && data.action_risk.risk_level, `Action risk assessed as [${data.action_risk?.risk_level}]`);
        } else {
          logResult(false, `Verification error: ${JSON.stringify(data.error)}`);
        }
      } catch (err) {
        logResult(false, `Network request failed for Scenario ${i + 1}: ${err.message}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Backend test suite executed successfully!');
    process.exit(0);
  }
}

runTests();
