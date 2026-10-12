import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Check, 
  Copy, 
  Download, 
  ArrowLeft,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { normalizeVerdictContract } from '../../contracts/verdictContract';

// Import our modular redesigned results components
import VerificationSummary from '../results/VerificationSummary';
import ResultsTabs, { RESULTS_TAB_KEYS } from '../results/ResultsTabs';
import OverviewTab from '../results/OverviewTab';
import EvidenceTab from '../results/EvidenceTab';
import InvestigationTab from '../results/InvestigationTab';
import SafetyFeedbackTab from '../results/SafetyFeedbackTab';

/**
 * Redesigned ResultScreen
 * Modern, clean, tab-based fact-checking dashboard.
 * Solves the long continuous layout problem by organizing findings into 4 focused tabs.
 */
export default function ResultScreen() {
  const { 
    resultData, 
    resetVerification, 
    isMockMode,
    selectPreset,
    activePresetKey,
    goToSandbox
  } = useVerification();

  const [activeTab, setActiveTab] = useState(RESULTS_TAB_KEYS.OVERVIEW);
  const [copied, setCopied] = useState(false);

  // Canonical normalized verdict contract
  const contract = useMemo(() => {
    if (!resultData) return null;
    return normalizeVerdictContract(resultData, { mode: isMockMode ? 'mock' : 'live' });
  }, [resultData, isMockMode]);

  if (!contract) {
    return (
      <div className="empty-result-state" role="status">
        <div className="empty-icon-wrap">
          <RotateCcw size={32} />
        </div>
        <h3>No verification data available</h3>
        <p>Submit a forward or choose one of the mock scenarios to generate a report.</p>
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

  const { verdict, input, actionRisk, evidence = [] } = contract;
  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  const handleCopySummary = () => {
    const lines = [
      `[TruthLens Verification Report]`,
      `Determination: ${verdict.label} (${verdict.status})`,
      verdict.confidence !== null ? `Evaluated Confidence: ${(verdict.confidence * 100).toFixed(0)}%` : null,
      `Extracted Claim: "${input.extractedClaim || 'N/A'}"`,
      ``,
      `What This Means:`,
      `${verdict.explanation || 'No explanation provided.'}`,
      ``,
      actionRisk?.safetyAdvice ? `Recommended Action: ${actionRisk.safetyAdvice}` : null,
      ``,
      `Verified via TruthLens Multimodal Fact-Checking Engine.`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(contract, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `truthlens_verdict_${contract.id || 'report'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const hasSafetyRisk = actionRisk && (
    actionRisk.level === 'CRITICAL' || 
    actionRisk.level === 'HIGH' || 
    Boolean(actionRisk.warningFlag)
  );

  return (
    <div className="redesigned-results-container" aria-label="Verification Report Dashboard">
      
      {/* 1. Live Mode Disclosure Banner (if running live model) */}
      <div className="compact-live-banner" role="status">
        <Sparkles size={16} className="live-sparkle-icon" aria-hidden="true" />
        <span>
          <strong>{contract.mode === 'live' ? 'Live AI Verification' : 'Demo Evaluation'} Complete:</strong> Dual agents cross-referenced authoritative sources.
        </span>
        <button
          type="button"
          className="btn-sandbox-link"
          onClick={goToSandbox}
          style={{
            marginLeft: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--color-forest)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <LayoutDashboard size={13} />
          <span>View Live Investigation Sandbox</span>
        </button>
      </div>

      {/* 2. Verification Summary — First Screen (understand in under 10 seconds) */}
      <VerificationSummary 
        contract={contract}
        isMockMode={isMockMode}
        activePresetKey={activePresetKey}
        onSelectPreset={(key) => selectPreset(key, true)}
      />

      {/* 3. Horizontal Tab Navigation Bar (4 clean tabs) */}
      <ResultsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        evidenceCount={safeEvidence.length}
        hasSafetyRisk={hasSafetyRisk}
      />

      {/* 4. Active Tab Content (Only currently selected tab is visible) */}
      <div className="results-tab-viewport">
        {activeTab === RESULTS_TAB_KEYS.OVERVIEW && (
          <OverviewTab 
            contract={contract} 
            onNavigateTab={setActiveTab} 
          />
        )}

        {activeTab === RESULTS_TAB_KEYS.EVIDENCE && (
          <EvidenceTab 
            contract={contract} 
          />
        )}

        {activeTab === RESULTS_TAB_KEYS.INVESTIGATION && (
          <InvestigationTab 
            contract={contract} 
          />
        )}

        {activeTab === RESULTS_TAB_KEYS.SAFETY && (
          <SafetyFeedbackTab 
            contract={contract} 
            onCopySummary={handleCopySummary}
            copied={copied}
            onDownloadJson={handleDownloadJson}
          />
        )}
      </div>

      {/* 5. Compact Bottom Action Controls */}
      <footer className="redesigned-results-footer">
        <button
          type="button"
          className="btn-primary footer-verify-btn"
          onClick={resetVerification}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Verify Another Forward</span>
        </button>

        <div className="footer-secondary-actions">
          <button
            type="button"
            className="footer-action-link"
            onClick={goToSandbox}
          >
            <LayoutDashboard size={14} />
            <span>Investigation Sandbox</span>
          </button>

          <button
            type="button"
            className="footer-action-link"
            onClick={handleCopySummary}
          >
            {copied ? <Check size={14} color="var(--verdict-supported)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="footer-action-link"
            onClick={handleDownloadJson}
          >
            <Download size={14} />
            <span>Download JSON</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
