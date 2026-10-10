# TruthLens Live Demo Runbook

A battle-tested presentation guide for presenting **TruthLens** live to evaluators, judges, and users.

---

## 1. Quick Setup (2 Minutes Before Demo)

1. **Verify Backend is Running**:
   ```bash
   npm run dev:backend
   ```
   Check `http://localhost:8000/api/health` returns `status: "ok"`.
2. **Verify Frontend is Running**:
   ```bash
   npm run dev:frontend
   ```
   Open `http://localhost:5173` in Chrome/Brave.
3. **Confirm Mode Pill**:
   Notice the top-right header button shows **"Mode: Live AI"** (with subtle emerald pulsing animation).

---

## 2. Recommended 3-Minute Demo Script

### Scene 1: The Viral Health Misinformation Forward (Live AI Mode)
- **Action**: Select the **Text Forward** tab.
- **Narrative**: *"Misinformation on messaging apps spreads in multimodal formats. Let's test a viral WhatsApp forward claiming warm lemon water and baking soda cures cancer."*
- **Click**: Click *"Run Multi-Agent Verification"*.
- **Highlight**:
  - Show the 4-step progressive animation (Extracting claim $\rightarrow$ Synthesizing knowledge $\rightarrow$ Adversarial stress-test $\rightarrow$ Finalizing verdict).
  - Reveal the Verdict: **FALSE** with 98% confidence.
  - Switch through the 4 tabs:
    - **Overview**: Plain explanation, critical risk level, warning flag.
    - **Evidence**: Authoritative quotes from oncologists and WHO mythbusters.
    - **Investigation**: Adversarial counter-evidence, edge cases, truth timeline.
    - **Safety & Actions**: Direct advice on what to reply on WhatsApp and button to copy report summary.

### Scene 2: High-Speed Cached Replay
- **Action**: Click *"Verify Another Forward"*, click the same health preset or paste the same text, and hit Verify.
- **Result**: Instant response in **< 50ms** with the `⚡ Cached Replay` badge.
- **Narrative**: *"TruthLens incorporates an in-memory LRU cache with SHA-256 fingerprinting. Repeat forwards are served instantaneously with zero AI token overhead."*

### Scene 3: Multimodal Verification (Image / Audio)
- **Action**: Click the **Image** tab.
- **Upload**: Upload a screenshot of a suspicious SMS (e.g. SBI YONO KYC block).
- **Result**: Vision OCR extracts text, detects the phishing domain, identifies smishing risk, and marks determination as **FALSE / SCAM**.

### Scene 4: Offline / Fault-Tolerant Demo Fixtures Mode
- **Action**: Click the **"Mode: Live AI"** button in the header. It switches to **"Mode: Demo Fixtures"** (amber).
- **Narrative**: *"TruthLens is built with high reliability. If a live presenter has zero internet connectivity, Demo Fixture Mode runs 100% locally from our validated Ajv JSON contracts."*
- **Test**: Run any scenario; notice instant, deterministic, polished demo results.

---

## 3. Emergency Recovery Cheat Sheet

| Situation During Presentation | Immediate One-Click Remedy |
|---|---|
| Gemini API quota exhausted / 429 error | The UI shows an Error Banner with **"Switch to Demo Mode & Retry"**. Click it to continue without missing a beat! |
| Wi-Fi disconnects or drops | Click the **"Mode: Live AI"** button in header to switch to **"Demo Fixtures"**. |
| Blurry image uploaded | The UI displays a friendly notice explaining that text was unreadable and prompts for a clearer image. |
