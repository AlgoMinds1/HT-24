/**
 * TruthLens Contract Fixture Validator
 * Validates all fixture JSON files against contracts/verdict.schema.json using Ajv.
 */

const fs = require('fs');
const path = require('path');

function loadJson(filePath) {
  const absolutePath = path.resolve(__dirname, '..', filePath);
  const rawData = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(rawData);
}

function runValidation() {
  console.log('🔍 [TruthLens] Starting Ajv Schema Validation for Fixtures...\n');

  let Ajv;
  let addFormats;

  try {
    Ajv = require('ajv');
  } catch (e) {
    console.error('❌ "ajv" package is not installed yet.');
    console.error('👉 Please run: npm install --save-dev ajv ajv-formats\n');
    process.exit(1);
  }

  try {
    addFormats = require('ajv-formats');
  } catch (e) {
    // Optional formats
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  if (addFormats) {
    addFormats(ajv);
  }

  const schema = loadJson('contracts/verdict.schema.json');
  const validate = ajv.compile(schema);

  const fixtureFiles = [
    'contracts/fixtures/outdated_gov_scheme.json',
    'contracts/fixtures/false_health_claim.json',
    'contracts/fixtures/suspicious_kyc_message.json'
  ];

  let allPassed = true;

  for (const fixturePath of fixtureFiles) {
    const data = loadJson(fixturePath);
    const valid = validate(data);

    if (valid) {
      console.log(`✅ PASS: ${fixturePath}`);
      console.log(`   Claim: "${data.claim.substring(0, 60)}..."`);
      console.log(`   Verdict: [${data.verdict}] | Confidence: ${data.confidence.score} (${data.confidence.rating})\n`);
    } else {
      allPassed = false;
      console.error(`❌ FAIL: ${fixturePath}`);
      console.error(JSON.stringify(validate.errors, null, 2));
      console.log('');
    }
  }

  if (allPassed) {
    console.log('🎉 All 3 fixture files successfully validated against contracts/verdict.schema.json!');
    process.exit(0);
  } else {
    console.error('⚠️ Schema validation failed on one or more fixtures.');
    process.exit(1);
  }
}

runValidation();
