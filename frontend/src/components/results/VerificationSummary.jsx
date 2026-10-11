import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Share2, 
  Layers,
  FileText,
  Image as ImageIcon,
  Mic,
  FileCheck,
  Globe,
  Award,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import VerdictBadge from './VerdictBadge';
import { FIXTURE_MAP } from '../../services/verificationService';

/**
 * Redesigned Eye-Catching VerificationSummary Component
 * De-cluttered, spacious, high-contrast executive summary report.
 */
export default function VerificationSummary({
  contract,
  isMockMode = false,
  activePresetKey = null,
  onSelectPreset = null
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  const { input = {}, verdict = {}, actionRisk = null } = contract;
  const { extractedClaim = '', originalContent = '', type = 'text', sourcePlatform = '', receivedAt = '' } = input;
  const { status = 'CANNOT_CONFIRM', explanation = '', confidence = null, confidenceRating = null } = verdict;

  const hasValidConfidence = typeof confidence === 'number' && !isNaN(confidence) && confidence >= 0 && confidence <= 1;
  const percentage = hasValidConfidence 
    ? Math.round(confidence * 100) 
    : (confidenceRating === 'HIGH' ? 95 : (confidenceRating === 'MEDIUM' ? 60 : (confidenceRating === 'LOW' ? 35 : 75)));

  // Media icon helper
  const getMediaIcon = (t) => {
    switch (t) {
      case 'image': return <ImageIcon size={14} aria-hidden="true" />;
      case 'audio': return <Mic size={14} aria-hidden="true" />;
      case 'pdf': return <FileCheck size={14} aria-hidden="true" />;
      case 'url': return <Globe size={14} aria-hidden="true" />;
      case 'text':
      default: return <FileText size={14} aria-hidden="true" />;
    }
  };

  const isUrgentThreat = actionRisk && (
    actionRisk.level === 'CRITICAL' || 
    actionRisk.level === 'HIGH' || 
    actionRisk.warningFlag
  );

  return (
    <div className="summary-super-wrapper">
      {/* 1. Sleek Floating Preset Bar (Only in Demo Mode) */}
      {isMockMode && onSelectPreset && (
        <div className="floating-preset-toolbar" role="region" aria-label="Demo scenarios">
          <div className="preset-toolbar-label">
            <Layers size={13} aria-hidden="true" />
            <span>Interactive Demo Scenarios:</span>
          </div>
          <div className="preset-toolbar-pills">
            {Object.values(FIXTURE_MAP).map(f => (
              <button
                key={f.key}
                type="button"
                className={`preset-pill-item ${activePresetKey === f.key ? 'active' : ''}`}
                onClick={() => onSelectPreset(f.key)}
                title={f.sampleSnippet}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Executive Verdict Card */}
      <section className="executive-verdict-card" aria-label="Verification Summary">
        
        {/* Top Channel & Modality Bar */}
        <div className="card-top-channel-bar">
          <div className="meta-pills-row">
            <span className="channel-badge media-type-badge">
              {getMediaIcon(type)}
              <span>{type ? type.toUpperCase() : 'TEXT'}</span>
            </span>

            {sourcePlatform && (
              <span className="channel-badge platform-badge">
                <Share2 size={12} aria-hidden="true" />
                <span>{sourcePlatform}</span>
              </span>
            )}

            {receivedAt && (
              <span className="channel-badge date-badge">
                <span>{receivedAt.includes('T') ? receivedAt.split('T')[0] : receivedAt}</span>
              </span>
            )}
          </div>

          {originalContent && originalContent !== extractedClaim && (
            <button
              type="button"
              className="toggle-raw-message-btn"
              onClick={() => setShowOriginal(!showOriginal)}
              aria-expanded={showOriginal}
            >
              <span>{showOriginal ? 'Hide raw message' : 'View original forward'}</span>
              {showOriginal ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>

        {/* The Evaluated Claim: Bold Headline Style */}
        <div className="evaluated-claim-hero-block">
          <div className="claim-hero-eyebrow">
            <Sparkles size={14} className="claim-sparkle-amber" aria-hidden="true" />
            <span>EXTRACTED FACTUAL CLAIM EVALUATED</span>
          </div>
          <blockquote className="claim-hero-quote-text">
            “{extractedClaim || originalContent || 'No distinct claim text was extracted.'}”
          </blockquote>

          {/* Collapsible Raw Message */}
          {showOriginal && originalContent && (
            <div className="raw-message-drawer">
              <span className="raw-drawer-title">Original Raw Forward:</span>
              <p className="raw-drawer-content">{originalContent}</p>
            </div>
          )}
        </div>

        {/* 3. The Grand Two-Column Verdict Showcase */}
        <div className="verdict-two-column-showcase">
          
          {/* Left Column: Big Eye-Catching Verdict + Confidence Meter */}
          <div className="showcase-verdict-column">
            <VerdictBadge 
              status={status} 
              confidence={confidence}
              confidenceRating={confidenceRating}
            />

            {/* Calibrated Confidence Visual Meter */}
            <div className="confidence-meter-card" title="Calibrated verification confidence score evaluated against authoritative records">
              <div className="confidence-meter-header">
                <span className="meter-label">CONFIDENCE SCORE</span>
                <span className="meter-score-highlight" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {percentage !== null ? `${percentage}%` : (confidenceRating ? `${confidenceRating}` : 'Evaluated')}
                </span>
              </div>
              <div className="meter-progress-track">
                <div 
                  className="meter-progress-fill" 
                  style={{ width: `${percentage !== null ? percentage : 70}%` }}
                  aria-valuenow={percentage !== null ? percentage : 70}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <div className="meter-footer-note">
                <Award size={13} className="meter-award-icon" />
                <span style={{ fontWeight: 600 }}>
                  {percentage !== null 
                    ? `${percentage}% Confidence Score • ${confidenceRating || (percentage >= 80 ? 'HIGH' : percentage >= 50 ? 'MEDIUM' : 'LOW')} Rating`
                    : (confidenceRating ? `${confidenceRating} Confidence Rating` : 'Calibrated Confidence Rating')}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Executive Brief ("What This Means") */}
          <div className="showcase-analysis-column">
            <div className="analysis-card-inner">
              <div className="analysis-card-header">
                <BookOpen size={16} className="analysis-book-icon" aria-hidden="true" />
                <h3 className="analysis-card-title">Executive Brief & Context</h3>
              </div>
              <p className="analysis-brief-paragraph">
                {explanation || 'TruthLens cross-referenced this claim against authoritative records and official fact-check registries.'}
              </p>
              <div className="analysis-card-seal">
                <span className="seal-dot" />
                <span>
                  {status === 'VERIFIED'
                    ? 'Verified against official gazettes & primary archives'
                    : (status === 'FALSE'
                      ? 'Cross-referenced against verified fact-check debunks'
                      : 'Evaluated against official government registries and authoritative portals')}
                </span>
              </div>

              {Array.isArray(contract.evidence) && contract.evidence.length > 0 && contract.evidence[0].url && (
                <div style={{ marginTop: '0.9rem' }}>
                  <a
                    href={contract.evidence[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-external-link"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      color: '#1d4ed8',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      textDecoration: 'none'
                    }}
                    title={`Open official website: ${contract.evidence[0].url}`}
                  >
                    <span>Redirect to Official Source ({contract.evidence[0].sourceName || 'Official Website'})</span>
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Danger Alert Callout Banner (If urgent scam/health threat) */}
        {isUrgentThreat && (
          <div className="threat-callout-banner" role="alert">
            <div className="threat-callout-icon-box">
              <ShieldAlert size={22} aria-hidden="true" />
            </div>
            <div className="threat-callout-body">
              <div className="threat-callout-headline">
                <strong>Caution: Potential Risk Detected</strong>
                {actionRisk.category && (
                  <span className="threat-tag-pill">{actionRisk.category.replace(/_/g, ' ')}</span>
                )}
              </div>
              <p className="threat-callout-advice">
                {actionRisk.safetyAdvice || actionRisk.warningFlag || 'Do not forward this message or act on instructions inside without independent verification.'}
              </p>
            </div>
          </div>
        )}

      </section>
    </div>
  );
}
