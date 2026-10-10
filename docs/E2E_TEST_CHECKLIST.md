# TruthLens End-to-End Test & Live Demo Checklist

This document provides a systematic test matrix and step-by-step verification procedure for TruthLens across **Live AI Mode**, **Demo Fixture Mode**, all **5 input modalities**, and **11 stress edge-cases**.

---

## 1. Environment & Mode Verification

| # | Check Item | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| **M-1** | Header Mode Switcher | Click the Mode pill button in the top navigation bar. | Mode toggles smoothly between `Live AI` (emerald indicator) and `Demo Fixtures` (amber indicator). State persists across page refreshes (`localStorage`). | `PASS` |
| **M-2** | Offline Fixture Mode | Select `Demo Fixtures` mode. Run any preset claim. | Verification resolves deterministically in ~3.5s with zero external API calls or network reliance. | `PASS` |
| **M-3** | Live AI Mode | Select `Live AI` mode with valid `GEMINI_API_KEY`. Submit claim. | Verification resolves via grounded retrieval (KB + FactCheck API) and Gemini reasoning, displaying the `Live AI Verification Active` banner. | `PASS` |

---

## 2. Five Input Modalities Checklist

| # | Modality | Test Input / Action | Expected Result | Status |
|---|---|---|---|---|
| **I-1** | **Text Forward** | Enter: *"Drinking warm lemon water and baking soda cures cancer cells in 48 hours."* | Claims isolated; KB grounded; Verdict: `FALSE` with high confidence (debunked by oncologists). | `PASS` |
| **I-2** | **Web URL** | Enter valid URL: `https://pmkisan.gov.in/` | URL domain extracted; claim synthesized; passes schema validation. | `PASS` |
| **I-3** | **Image / Screenshot** | Upload PNG/JPEG screenshot of a forwarded WhatsApp message. | Magic bytes verified; OCR extracts text; visual claim synthesized; claim verified. | `PASS` |
| **I-4** | **Audio Voice Note** | Upload MP3/WAV voice recording. | Magic bytes verified; audio transcribed; core spoken claim extracted and verified. | `PASS` |
| **I-5** | **PDF Circular** | Upload PDF document (e.g., fraudulent government circular). | PDF magic header `%PDF-` validated; text extracted from binary stream; claim verified. | `PASS` |

---

## 3. Eleven Stress & Robustness Scenarios

### Scenario 1: No Evidence Available
- **Input**: Completely fabricated novel claim (e.g., *"Aliens landed in New Delhi metro station yesterday"*).
- **Expected Outcome**: Strictly returns `UNCONFIRMED` verdict with low confidence ($\le 0.30$) and clear rationale that no credible authoritative sources corroborate the assertion. Zero hallucination.

### Scenario 2: Mixed Evidence
- **Input**: Claim combining genuine programs with false promises (e.g., *"Government gives 6000 Rs under PM Kisan and free smartphones to everyone"*).
- **Expected Outcome**: Returns `PARTLY_TRUE` verdict; cites PM Kisan portal as `SUPPORTIVE` for the cash transfer and PIB Fact Check as `REFUTING` for smartphone claims.

### Scenario 3: Outdated-Only Evidence
- **Input**: Expired historical announcement (e.g., *"PM Free Laptop Scheme 2021 registration link open"*).
- **Expected Outcome**: Returns `OUTDATED` verdict; includes chronological `truth_timeline` detailing when the initiative closed and expired.

### Scenario 4: Conflicting Sources
- **Input**: Viral claim with conflicting reporting across blogs and regulatory agencies.
- **Expected Outcome**: Surfaces both `SUPPORTIVE` and `REFUTING` stances; lowers confidence score; documents uncertainty in adversarial stress-test.

### Scenario 5: Unreadable Image
- **Input**: Upload completely blurry, blank, or black PNG image.
- **Expected Outcome**: Emits structured HTTP 400 `UNREADABLE_INPUT` with warning: *"The uploaded image does not contain legible text or a distinct verifiable claim"*; UI displays actionable Error Alert Banner with suggestions.

### Scenario 6: Noisy Audio
- **Input**: Upload audio file containing pure static or heavy background distortion.
- **Expected Outcome**: Emits audio readability notice; prevents hallucinated transcript; informs user to attach a clearer voice note.

### Scenario 7: Multiple Claims
- **Input**: Long forward containing 3 or more disparate bulleted assertions.
- **Expected Outcome**: Detects multiple claims; isolates central primary claim; populates `subclaims` array in extraction metadata with a user warning.

### Scenario 8: Unsupported Content Format
- **Input**: Upload an executable (`.exe`), shell script, or disallowed file type.
- **Expected Outcome**: Multer filter rejects file with HTTP 415 `UNSUPPORTED_MEDIA_TYPE`; client-side validator blocks upload with immediate amber warning banner.

### Scenario 9: Request Timeout
- **Input**: Slow backend upstream response exceeding timeout threshold.
- **Expected Outcome**: Frontend `AbortController` triggers after timeout; UI displays *"Verification timed out"* banner with an instant **"Retry Verification"** button.

### Scenario 10: Rate Limit Handling
- **Input**: Rapid sequential queries exhausting Gemini API token quota (HTTP 429).
- **Expected Outcome**: Caught as `RATE_LIMITED`; UI offers **"Switch to Demo Mode & Retry"** button so presenters can seamlessly continue without interruption.

### Scenario 11: Provider Failure Graceful Degradation
- **Input**: External Google Fact Check API or search provider fails or returns network error.
- **Expected Outcome**: Retrieval pipeline records `{ status: 'error' }` for the failed external provider and falls back to Curated KB vector store without crashing.

---

## 4. In-Memory Cache & Replay Verification

| # | Check Item | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| **C-1** | First Query | Submit a new claim in Live mode. | Query executes full pipeline (~3–5s); result stored in LRU cache with SHA-256 key. | `PASS` |
| **C-2** | Repeat Query (Replay) | Resubmit the exact same claim. | Response returns in **< 50ms**; UI displays `⚡ Cached Replay` pill tag in header. | `PASS` |
| **C-3** | Cache Invalidation | Call `POST /api/cache/clear`. | Cache emptied; subsequent query executes full live retrieval. | `PASS` |

---

## 5. End-to-End Automated Test Execution

Run the complete Phase 7 automated scenario test suite:
```bash
npm run test:phase7
```

**Expected Console Output**:
```text
========================================================================
🧪 TRUTHLENS PHASE 7: LIVE DEMO DEPENDABILITY & SCENARIOS TEST SUITE
========================================================================

▶ [Part 1] Testing All 5 Input Types
  ✓ PASS: Input 1 (Text): Ingests text claim correctly
  ✓ PASS: Input 1 (Text): Retains claim semantics
  ✓ PASS: Input 2 (URL): Request validator parses URL type
  ✓ PASS: Input 3 (Image): Ingests valid image buffer with magic bytes
  ✓ PASS: Input 3 (Image): Retains original filename
  ✓ PASS: Input 4 (Audio): Ingests valid audio buffer with ID3 signature
  ✓ PASS: Input 4 (Audio): Retains voice note filename
  ✓ PASS: Input 5 (PDF): Ingests valid PDF buffer with %PDF magic header
  ✓ PASS: Input 5 (PDF): Retains circular filename

▶ [Part 2] Testing 11 Live Demo & Robustness Scenarios
  ✓ PASS: Scenario 1 (No evidence): Verdict is UNCONFIRMED
  ✓ PASS: Scenario 1 (No evidence): Confidence is appropriately low
  ✓ PASS: Scenario 1 (No evidence): Passes contracts/verdict.schema.json validation
  ✓ PASS: Scenario 2 (Mixed evidence): Complies with schema and handles opposing stances
  ✓ PASS: Scenario 3 (Outdated evidence): Complies with schema and sets OUTDATED verdict
  ✓ PASS: Scenario 4 (Conflicting sources): Detects diametrically opposed publisher stances
  ✓ PASS: Scenario 5 (Unreadable image): Flags warning and prevents artificial claim generation
  ✓ PASS: Scenario 6 (Noisy audio): Handles noisy audio and includes warning container
  ✓ PASS: Scenario 7 (Multiple claims): Detects bulleted list and populates subclaims array
  ✓ PASS: Scenario 7 (Multiple claims): Adds multiple claims warning notice
  ✓ PASS: Scenario 8 (Unsupported content): Rejects unsupported input type with HTTP 415
  ✓ PASS: Scenario 9 (Timeout): Formulates HTTP 504 REQUEST_TIMEOUT ApiError
  ✓ PASS: Scenario 10 (Rate limit): Generates structured RATE_LIMITED error
  ✓ PASS: Scenario 11 (Provider failure): Records provider error status without pipeline crash

▶ [Part 3] Testing In-Memory LRU Cache & Instant Replay
  ✓ PASS: Cache: Initial lookup is null (miss)
  ✓ PASS: Cache: Second lookup returns cached verdict (hit)
  ✓ PASS: Cache: Accurate hit and miss tracking in metrics

========================================================================
🏁 Phase 7 Test Suite Complete: 25 Passed, 0 Failed.
========================================================================
```
