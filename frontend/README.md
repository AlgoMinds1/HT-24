# TruthLens Frontend (React + Vite)

Interactive user interface for TruthLens — automated viral forward fact-checking and debunking intelligence system.

## Features & Screens

1. **Input Screen (`InputScreen.jsx`)**:
   - **5 Input Mode Tabs**: Text, Image/Screenshot, Audio/Voice Note, PDF Circular, and Link/URL.
   - **Real-Time Input Validation**: Disables the "Verify Forward" button if the text is empty/too short, the URL is malformed, or no file is selected.
   - **Quick-Test Presets**: Instant 1-click loading of the three canonical contract fixtures (*Outdated Gov Scheme*, *False Health Remedy*, *Suspicious KYC Smishing*).

2. **Analysis Screen (`AnalysisScreen.jsx`)**:
   - Multi-stage step progress tracker with active radar and pulse animations:
     1. `Extracting claim`
     2. `Searching sources`
     3. `Cross-checking evidence`
     4. `Preparing verdict`

3. **Result Screen (`ResultScreen.jsx`)**:
   - Conforms strictly to `contracts/verdict.schema.json`.
   - **Verdict Banner**: High-visibility badges for `SUPPORTED`, `FALSE`, `OUTDATED`, `PARTLY_TRUE`, `UNCONFIRMED`.
   - **Confidence Dial**: Score percentage, rating (`HIGH`/`MEDIUM`/`LOW`), and justification.
   - **Action Risk Advisory**: Critical/High alert banner, risk category, and immediate user safety steps.
   - **Extracted Claim & Plain Explanation**: Simple breakdown for end users.
   - **Authoritative Evidence Cards**: Stance pills (`REFUTES`, `SUPPORTS`, `CONTEXTUALIZES`), reliability score, and source links.
   - **Truth Timeline**: Chronological event history and policy changes.
   - **Stress-Test Drawer**: Adversarial checks, counter-arguments evaluated, and edge cases.
   - **Actions**: "Copy Verdict Summary" and "Verify Another Forward" to reset.

## How to Run Locally

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

## How to Test Each Screen

### 1. Testing Input Screen:
- **Text Tab**: Type or paste a short message. Notice the "Verify Forward" button becomes enabled once 10+ characters are entered.
- **Image Tab**: Drag and drop an image (`.png` / `.jpg`). Notice file preview and enabled verify button.
- **Audio Tab**: Select an audio clip (`.mp3` / `.wav`). Notice audio attachment preview.
- **PDF Tab**: Select a PDF circular (`.pdf`). Notice PDF attachment preview.
- **URL Tab**: Enter `https://example.com/fake-news`. Notice URL validation highlights invalid strings.
- **Presets**: Click on any of the 3 cards in **"Quick Test Scenarios"** (*Outdated Gov Scheme*, *False Health Remedy*, *Suspicious KYC SMS*) to pre-fill the form instantly.

### 2. Testing Analysis Screen:
- Click **"Verify Forward"**.
- Observe the step progression animating through:
  - Step 1: *Extracting claim*
  - Step 2: *Searching sources*
  - Step 3: *Cross-checking evidence*
  - Step 4: *Preparing verdict*

### 3. Testing Result Screen:
- Inspect all contract fields rendered (Verdict Badge, Confidence %, Risk Banner, Plain Explanation, Extracted Claim, Evidence Cards, Truth Timeline, and Stress-Test).
- Click **"Copy Verdict Summary"** to copy a structured text debunking summary.
- Click **"Verify Another Forward"** to reset the state and return to the Input screen.
