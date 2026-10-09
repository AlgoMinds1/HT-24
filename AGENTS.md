# TruthLens (PS3: "Is This Forward True?") - Agent Guidelines

## 1. Project Overview
TruthLens is an automated fact-checking and debunking intelligence system designed to verify viral forwards, suspicious claims, government scheme announcements, health advisories, and financial/KYC scam messages.

## 2. Directory Architecture
- `frontend/`: Interactive UI for querying forwards, viewing verdicts, timelines, and stress-tested evidence.
- `backend/`: Retrieval, claim-extraction, multi-agent verification pipeline, and scoring engine.
- `contracts/`: JSON Schemas defining standardized API responses and data formats (`verdict.schema.json`).
- `contracts/fixtures/`: Canonical sample fixture payloads used for testing and validation.
- `docs/`: System documentation, architecture diagrams, and verification methodology.
- `kb/`: Curated knowledge base, debunk archives, trusted domains, and baseline facts.

## 3. Core Contract Rules
All claim verification outputs produced by any backend service or agent **MUST** strictly conform to `contracts/verdict.schema.json`.

### Allowed Verdicts:
1. `SUPPORTED`: Claim is fully backed by credible, up-to-date authoritative sources.
2. `FALSE`: Claim is fabricated, debunked, or completely contradicted by credible evidence.
3. `OUTDATED`: Information was previously true or valid, but has expired, been superseded, or discontinued.
4. `PARTLY_TRUE`: Contains a mix of true elements and misleading or inaccurate extrapolations.
5. `UNCONFIRMED`: Insufficient reliable evidence exists to conclusively support or debunk the claim.

### Top-Level Schema Fields:
- `input`: The original query / forward text and metadata.
- `claim`: Atomic factual claim extracted from input.
- `verdict`: One of the 5 allowed verdicts above.
- `confidence`: Confidence rating (0.0 to 1.0) and justification.
- `plain_explanation`: Simple, jargon-free summary for end users.
- `evidence`: Array of structured evidence references (source, title, quote, stance, URL).
- `stress_test`: Adversarial verification, edge cases, counter-evidence analysis, and potential failure modes.
- `truth_timeline`: Chronological evolution of the claim and factual status over time.
- `action_risk`: Assessment of user harm (scam risk, financial/health risk, urgency, advised user action).

## 4. Security & Best Practices
- Never commit real API keys or sensitive credentials to git.
- Validate all mock data and API contracts using Ajv before integrating with services.
