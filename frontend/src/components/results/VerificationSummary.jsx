import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  Share2, 
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';
import VerdictBadge from './VerdictBadge';
import { FIXTURE_MAP } from '../../services/verificationService';

/**
 * VerificationSummary Component
 * First Screen: Immediate clarity in under 10 seconds without scrolling.
 * Displays:
 * 1. Prominent verdict badge & concise "What this means" (2-4 sentences)
 * 2. Extracted claim in a crisp card
 * 3. Collapsible "View original message" section
 * 4. Calibrated confidence rating (only if provided & valid)
 * 5. Compact danger warning banner (if high/critical risk)
 */
export default function VerificationSummary({
  contract,
  isMockMode = false,
  activePresetKey = null,
  onSelectPreset = null
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  const { input = {}, verdict = {}, actionRisk = null } = contract;
  const { extractedClaim = '', originalContent = '', type = 'text', sourcePlatform = '' } = input;
  const { status = 'CANNOT_CONFIRM', explanation = '', confidence = null, confidenceRating = null } = verdict;

  const hasValidConfidence = typeof confidence === 'number' && !isNaN(confidence) && confidence >= 0 && confidence <= 1;
  const percentage = hasValidConfidence ? Math.round(confidence * 100) : null;

  // Determine if there is an active high/critical safety danger
  const isUrgentThreat = actionRisk && (
    actionRisk.level === 'CRITICAL' || 
    actionRisk.level === 'HIGH' || 
    actionRisk.warningFlag
  );

  return (
    <section className="verification-summary-card" aria-label="Verification Summary">
      {/* Mock Scenario Switcher (Compact pill bar in fixture mode) */}
      {isMockMode && onSelectPreset && (
        <div className="summary-fixture-bar" role="region" aria-label="Demo scenarios">
          <div className="fixture-bar-label">
            <Layers size={13} aria-hidden="true" />
            <span>Demo Scenarios:</span>
          </div>
          <div className="fixture-bar-pills">
            {Object.values(FIXTURE_MAP).map(f => (
              <button
                key={f.key}
                type="button"
                className={`fixture-pill-btn ${activePresetKey === f.key ? 'active' : ''}`}
                onClick={() => onSelectPreset(f.key)}
                title={f.sampleSnippet}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top Section: Extracted Claim & Original Toggle */}
      <div className="summary-claim-container">
        <div className="summary-claim-header">
          <div className="claim-label-wrap">
            <Sparkles size={14} className="claim-sparkle-icon" aria-hidden="true" />
            <span className="claim-eyebrow">Evaluated Claim</span>
            {sourcePlatform && (
              <span className="claim-source-platform">
                <Share2 size={11} aria-hidden="true" />
                <span>{sourcePlatform}</span>
              </span>
            )}
          </div>

          {originalContent && originalContent !== extractedClaim && (
            <button
              type="button"
              className="original-toggle-btn"
              onClick={() => setShowOriginal(!showOriginal)}
              aria-expanded={showOriginal}
              aria-controls="original-forward-box"
            >
              <span>{showOriginal ? 'Hide original message' : 'View original message'}</span>
              {showOriginal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Crisp Extracted Claim Quote */}
        <blockquote className="summary-claim-quote">
          “{extractedClaim || originalContent || 'No distinct claim text was extracted.'}”
        </blockquote>

        {/* Collapsible Original Forward */}
        {showOriginal && originalContent && (
          <div id="original-forward-box" className="collapsible-original-box">
            <span className="original-box-title">Raw Forwarded Content:</span>
            <p className="original-box-text">{originalContent}</p>
          </div>
        )}
      </div>

      {/* Center Section: Verdict Badge & Plain English Explanation */}
      <div className="summary-verdict-row">
        <div className="summary-verdict-badge-wrap">
          <VerdictBadge status={status} />
          
          {/* Calibrated Confidence Dial */}
          {hasValidConfidence && (
            <div className="calibrated-confidence-chip" title="Confidence derived from evidence consistency and source corroboration">
              <span className="confidence-chip-score">{percentage}%</span>
              <span className="confidence-chip-label">
                {confidenceRating ? `${confidenceRating} Confidence` : 'Source Corroboration'}
              </span>
            </div>
          )}
        </div>

        {/* What this means explanation: 2-4 sentences */}
        <div className="summary-explanation-wrap">
          <div className="explanation-title-row">
            <Info size={15} className="explanation-info-icon" aria-hidden="true" />
            <span className="explanation-heading-text">What this means</span>
          </div>
          <p className="summary-explanation-text">
            {explanation || 'TruthLens cross-referenced this claim against authoritative records. Check the detailed evidence citations below for primary findings.'}
          </p>
        </div>
      </div>

      {/* Critical Danger Alert Banner (if urgent scam/health threat) */}
      {isUrgentThreat && (
        <div className="summary-threat-banner" role="alert">
          <ShieldAlert size={20} className="threat-banner-icon" aria-hidden="true" />
          <div className="threat-banner-content">
            <div className="threat-banner-title">
              <strong>Caution: Potential Risk Detected</strong>
              {actionRisk.category && (
                <span className="threat-category-tag">{actionRisk.category.replace(/_/g, ' ')}</span>
              )}
            </div>
            <p className="threat-banner-advice">
              {actionRisk.safetyAdvice || actionRisk.warningFlag || 'Do not forward this message or act on instructions inside without independent verification.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
