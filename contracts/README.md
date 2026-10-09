# TruthLens Schema & Contracts

This directory contains the canonical JSON Schemas and test fixtures governing the input/output structure of TruthLens fact-checking services.

## Schema Overview

- **`verdict.schema.json`**: Strict JSON Schema definition for verification results.
  - **Required Top-Level Fields**:
    - `input`: Raw forward text and metadata (platform, timestamp, media type).
    - `claim`: Extracted atomic factual statement.
    - `verdict`: Strict enum (`SUPPORTED`, `FALSE`, `OUTDATED`, `PARTLY_TRUE`, `UNCONFIRMED`).
    - `confidence`: Confidence score (0.0–1.0), qualitative rating, and rationale.
    - `plain_explanation`: Accessible summary explaining the verdict clearly to general users.
    - `evidence[]`: Array of authoritative source citations with stances, quotes, and URLs.
    - `stress_test`: Adversarial verification checks, counter-arguments, and edge cases.
    - `truth_timeline[]`: Chronological record of relevant events, dates, and significance.
    - `action_risk`: Risk classification, warning flags, and concrete recommended user actions.

## Fixtures

1. **`fixtures/outdated_gov_scheme.json`**: An expired student laptop distribution scheme (Verdict: `OUTDATED`).
2. **`fixtures/false_health_claim.json`**: Viral pseudoscience claim about lemon and baking soda curing cancer (Verdict: `FALSE`).
3. **`fixtures/suspicious_kyc_message.json`**: Urgent phishing SMS threatening bank account suspension (Verdict: `FALSE`, Risk: `PHISHING`).

## Running Ajv Schema Validation

### Option 1: Using npm (recommended)
```bash
# 1. Install dependencies
npm install

# 2. Run the validator
npm test
# or
npm run validate:contracts
```

### Option 2: Using npx / ajv-cli directly
```bash
npx ajv-cli compile -s contracts/verdict.schema.json
npx ajv-cli validate -s contracts/verdict.schema.json -d "contracts/fixtures/*.json"
```
