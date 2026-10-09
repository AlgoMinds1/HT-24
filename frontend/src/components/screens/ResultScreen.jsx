import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Check, 
  Copy, 
  Download, 
  ThumbsUp, 
  ThumbsDown, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { FIXTURE_MAP } from '../../services/verificationService';
import { normalizeVerdictContract } from '../../contracts/verdictContract';

// Import the six Phase 2 Reusable Components
import InputStrip from '../results/InputStrip';
import VerdictCard from '../results/VerdictCard';
import EvidenceList from '../results/EvidenceList';
import StressTestPanel from '../results/StressTestPanel';
import TruthTimeline from '../results/TruthTimeline';
import ActionRiskCard from '../results/ActionRiskCard';

/**
 * ResultScreen (Phase 2 Composition)
 * 
 * Composes the six reusable verification report components:
 * 1. InputStrip - Input format, raw forward, extracted claim, mock indicator
 * 2. VerdictCard - Primary determination, confidence score, plain English assessment
 * 3. EvidenceList - Traceable citations with relation filters and source links
 * 4. StressTestPanel - Multi-path checks, conflict detection, and counter-evidence
 * 5. TruthTimeline - Historical evolution and temporal factual shifts
 * 6. ActionRiskCard - Harm assessment and immediate safety steps
 * 
 * Preserves all Phase 1 features: JSON export, clipboard summary, fact-checker feedback,
 * and adds an instant fixture switcher in mock mode.
 */
export default function ResultScreen() {
  const { 
    resultData, 
    resetVerification, 
    isMockMode,
    selectPreset,
    activePresetKey
  } = useVerification();

  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'helpful' | 'unhelpful' | null

  // Canonical normalized verdict contract as the single source of truth
  const contract = useMemo(() => {
    if (!resultData) return null;
    return normalizeVerdictContract(resultData, { mode: isMockMode ? 'mock' : 'live' });
  }, [resultData, isMockMode]);

  if (!contract) {
    return (
      <div className="empty-result-state" role="status">
        <h3>No verification data available</h3>
        <p>Submit a forward or select one of the mock verification fixtures to generate a report.</p>
        <button 
          type="button" 
          className="btn-primary" 
          onClick={resetVerification} 
          style={{ marginTop: '1.25rem' }}
        >
          Return to Input Form
        </button>
      </div>
    );
  }

  const { input, verdict, evidence, stressTest, truthTimeline, actionRisk } = contract;

  const copySummary = () => {
    const lines = [
      `[TruthLens Verification Report]`,
      `Verdict: ${verdict.label} (${verdict.status})`,
      verdict.confidence !== null ? `Evaluated Confidence: ${(verdict.confidence * 100).toFixed(0)}%` : null,
      `Extracted Claim: "${input.extractedClaim || 'N/A'}"`,
      ``,
      `Plain Explanation:`,
      `${verdict.explanation || 'No explanation provided.'}`,
      ``,
      actionRisk?.safetyAdvice ? `Recommended Safety Action: ${actionRisk.safetyAdvice}` : null,
      ``,
      `Verified via TruthLens Multimodal Verification Engine.`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contract, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `truthlens_verdict_${contract.id || 'report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="result-screen-root" aria-label="Verification Report">
      {/* Mock Mode Quick Fixture Switcher */}
      {isMockMode && (
        <div className="fixture-quick-switcher" role="region" aria-label="Mock Fixtures Demo Bar">
          <div className="switcher-label">
            <Layers size={15} aria-hidden="true" />
            <span>Switch Mock Scenario:</span>
          </div>
          <div className="switcher-buttons-group">
            {Object.values(FIXTURE_MAP).map(f => (
              <button
                key={f.key}
                type="button"
                className={`switcher-pill ${activePresetKey === f.key ? 'active' : ''}`}
                onClick={() => selectPreset(f.key, true)}
                title={f.sampleSnippet}
              >
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COMPONENT 1: InputStrip */}
      <InputStrip 
        input={input} 
        mode={contract.mode} 
      />

      {/* COMPONENT 2: VerdictCard */}
      <VerdictCard 
        verdict={verdict} 
      />

      {/* COMPONENT 3: EvidenceList */}
      <EvidenceList 
        evidence={evidence} 
      />

      {/* COMPONENT 4: StressTestPanel */}
      <StressTestPanel 
        stressTest={stressTest} 
      />

      {/* COMPONENT 5: TruthTimeline */}
      <TruthTimeline 
        truthTimeline={truthTimeline} 
      />

      {/* COMPONENT 6: ActionRiskCard */}
      <ActionRiskCard 
        actionRisk={actionRisk} 
      />

      {/* Interactive Fact-Checker Feedback Card */}
      <div className="feedback-box" role="region" aria-label="Report feedback">
        <div className="feedback-leading-text">
          <Info size={18} className="feedback-info-icon" aria-hidden="true" />
          <span>Was this verification analysis accurate and helpful?</span>
        </div>
        <div className="feedback-btn-group">
          <button
            type="button"
            className={`feedback-btn ${feedbackGiven === 'helpful' ? 'active-helpful' : ''}`}
            onClick={() => setFeedbackGiven('helpful')}
            aria-pressed={feedbackGiven === 'helpful'}
          >
            <ThumbsUp size={14} aria-hidden="true" />
            <span>{feedbackGiven === 'helpful' ? 'Thanks for feedback!' : 'Helpful'}</span>
          </button>
          <button
            type="button"
            className={`feedback-btn ${feedbackGiven === 'unhelpful' ? 'active-unhelpful' : ''}`}
            onClick={() => setFeedbackGiven('unhelpful')}
            aria-pressed={feedbackGiven === 'unhelpful'}
          >
            <ThumbsDown size={14} aria-hidden="true" />
            <span>{feedbackGiven === 'unhelpful' ? 'Flagged for Review' : 'Needs Review'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <footer className="result-actions-footer">
        <div className="result-export-buttons">
          <button
            type="button"
            className="tab-btn export-action-btn"
            onClick={copySummary}
          >
            {copied ? <Check size={18} color="var(--verdict-supported)" /> : <Copy size={18} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="tab-btn export-action-btn"
            onClick={downloadJson}
          >
            <Download size={18} />
            <span>Download Verdict JSON</span>
          </button>
        </div>

        <button
          type="button"
          className="btn-primary verify-another-btn"
          onClick={resetVerification}
        >
          <RotateCcw size={18} />
          <span>Verify Another Forward</span>
        </button>
      </footer>
    </div>
  );
}
