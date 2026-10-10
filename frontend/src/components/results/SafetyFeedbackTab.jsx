import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Check, 
  Download, 
  Info,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

/**
 * SafetyFeedbackTab Component
 * Tab 4: Recipient Risk Assessment, Safety Actions, User Feedback, and Report Export.
 */
export default function SafetyFeedbackTab({ contract, onCopySummary, copied = false, onDownloadJson }) {
  const [feedback, setFeedback] = useState(null); // 'helpful' | 'review' | null

  const { actionRisk = null, verdict = {}, input = {} } = contract;

  const level = actionRisk?.level || 'UNKNOWN';
  const category = actionRisk?.category || '';
  const safetyAdvice = actionRisk?.safetyAdvice || '';
  const reasoning = actionRisk?.reasoning || '';
  const warningFlag = actionRisk?.warningFlag || '';
  const requestedAction = actionRisk?.requestedAction || '';

  const getRiskIcon = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
      case 'HIGH':
        return <ShieldAlert size={28} className="safety-badge-icon icon-critical" aria-hidden="true" />;
      case 'MEDIUM':
        return <AlertTriangle size={28} className="safety-badge-icon icon-medium" aria-hidden="true" />;
      case 'LOW':
        return <ShieldCheck size={28} className="safety-badge-icon icon-low" aria-hidden="true" />;
      case 'UNKNOWN':
      default:
        return <HelpCircle size={28} className="safety-badge-icon icon-unknown" aria-hidden="true" />;
    }
  };

  const getRiskLabel = (lvl) => {
    switch (lvl) {
      case 'CRITICAL': return 'Critical Threat Level';
      case 'HIGH': return 'High Risk Warning';
      case 'MEDIUM': return 'Moderate Caution';
      case 'LOW': return 'Low / Safe Message';
      case 'UNKNOWN':
      default: return 'Standard Risk Profile';
    }
  };

  return (
    <div id="tab-panel-safety" role="tabpanel" aria-labelledby="tab-btn-safety" className="tab-content-panel">
      
      {/* 1. Recipient Harm & Risk Assessment Card */}
      <section className="safety-evaluation-card" aria-label="Risk Assessment">
        <div className="safety-eval-header">
          <div className="safety-eval-badge-group">
            {getRiskIcon(level)}
            <div>
              <span className="safety-eval-eyebrow">Recipient Harm Evaluation</span>
              <h3 className="safety-eval-title">{getRiskLabel(level)}</h3>
            </div>
          </div>

          {category && (
            <span className="safety-category-chip">
              {category.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {warningFlag && (
          <div className="safety-urgent-callout" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{warningFlag}</span>
          </div>
        )}

        <div className="safety-grid-cards">
          {/* Card: Concrete Recommended Actions */}
          <div className="safety-subcard practical-advice-card">
            <div className="subcard-title-row">
              <CheckCircle2 size={16} className="subcard-accent-icon" aria-hidden="true" />
              <h4 className="subcard-heading">Practical Safety Guidance</h4>
            </div>
            <p className="subcard-body-text">
              {safetyAdvice || 'Do not forward unconfirmed claims to group chats. Check official verified portals before sharing.'}
            </p>
          </div>

          {/* Card: Message Prompted Action */}
          {requestedAction && (
            <div className="safety-subcard prompted-action-card">
              <div className="subcard-title-row">
                <Lock size={16} className="subcard-accent-icon" aria-hidden="true" />
                <h4 className="subcard-heading">What the Message Urges Recipient to Do</h4>
              </div>
              <p className="subcard-body-text italic">
                “{requestedAction}”
              </p>
            </div>
          )}
        </div>

        {reasoning && (
          <div className="safety-rationale-box">
            <strong>Why this risk level was assigned:</strong>
            <p>{reasoning}</p>
          </div>
        )}
      </section>

      {/* 2. Fact-Checker Community Feedback Controls */}
      <section className="feedback-rating-card" aria-label="Analysis Feedback">
        <div className="feedback-text-wrap">
          <Info size={18} className="feedback-icon" aria-hidden="true" />
          <div>
            <h4 className="feedback-title">Was this verification helpful and accurate?</h4>
            <p className="feedback-sub">Your feedback directly improves our claim extraction and debunking intelligence.</p>
          </div>
        </div>

        <div className="feedback-actions-row">
          <button
            type="button"
            className={`feedback-choice-btn ${feedback === 'helpful' ? 'chosen-helpful' : ''}`}
            onClick={() => setFeedback('helpful')}
            aria-pressed={feedback === 'helpful'}
          >
            <ThumbsUp size={15} aria-hidden="true" />
            <span>{feedback === 'helpful' ? 'Helpful — Thank you!' : 'Helpful'}</span>
          </button>

          <button
            type="button"
            className={`feedback-choice-btn ${feedback === 'review' ? 'chosen-review' : ''}`}
            onClick={() => setFeedback('review')}
            aria-pressed={feedback === 'review'}
          >
            <ThumbsDown size={15} aria-hidden="true" />
            <span>{feedback === 'review' ? 'Flagged for Review' : 'Needs Review'}</span>
          </button>
        </div>
      </section>

      {/* 3. Report Export & Sharing Actions */}
      <section className="report-export-card" aria-label="Export verification report">
        <div className="export-title-wrap">
          <h4 className="export-heading">Export & Share Report</h4>
          <p className="export-sub">Copy a clean plain-text summary or download the standardized JSON verdict payload.</p>
        </div>

        <div className="export-buttons-group">
          <button
            type="button"
            className="export-btn"
            onClick={onCopySummary}
          >
            {copied ? <Check size={16} color="var(--verdict-supported)" /> : <Copy size={16} />}
            <span>{copied ? 'Summary Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="export-btn"
            onClick={onDownloadJson}
          >
            <Download size={16} />
            <span>Download Verdict JSON</span>
          </button>
        </div>
      </section>
    </div>
  );
}
