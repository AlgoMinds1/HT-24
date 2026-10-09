import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  HelpCircle, 
  Info,
  ShieldCheck,
  Award
} from 'lucide-react';
import { VERDICT_LABELS, VERDICT_DESCRIPTIONS } from '../../contracts/verdictContract';

/**
 * VerdictCard Component
 * 
 * Presents the primary verification outcome prominently, with accessible visual treatment,
 * validated confidence dial (only when valid), and concise plain-language explanation.
 * 
 * @param {Object} props
 * @param {Object} props.verdict - Verdict object from VerdictContract
 */
export default function VerdictCard({ verdict = {} }) {
  const {
    status = 'CANNOT_CONFIRM',
    label,
    confidence = null,
    confidenceRating = null,
    explanation = '',
    rationale = ''
  } = verdict;

  const displayLabel = label || VERDICT_LABELS[status] || VERDICT_LABELS.CANNOT_CONFIRM;

  const getStatusIcon = (s) => {
    switch (s) {
      case 'VERIFIED':
        return <CheckCircle2 size={32} className="verdict-icon status-verified" aria-hidden="true" />;
      case 'FALSE':
        return <XCircle size={32} className="verdict-icon status-false" aria-hidden="true" />;
      case 'OUTDATED':
        return <Clock size={32} className="verdict-icon status-outdated" aria-hidden="true" />;
      case 'PARTLY_SUPPORTED':
        return <AlertTriangle size={32} className="verdict-icon status-partly" aria-hidden="true" />;
      case 'CANNOT_CONFIRM':
      default:
        return <HelpCircle size={32} className="verdict-icon status-unconfirmed" aria-hidden="true" />;
    }
  };

  const hasValidConfidence = typeof confidence === 'number' && !isNaN(confidence) && confidence >= 0 && confidence <= 1;
  const percentage = hasValidConfidence ? Math.round(confidence * 100) : null;

  return (
    <section className={`verdict-card-container verdict-${status.toLowerCase()}`} aria-label="Verification Outcome">
      <div className="verdict-card-top-row">
        {/* Status Emblem & Text */}
        <div className="verdict-badge-group">
          <div className="verdict-icon-bubble">
            {getStatusIcon(status)}
          </div>
          <div>
            <div className="verdict-sublabel">Primary Factual Determination</div>
            <h2 className="verdict-title">
              <span className={`verdict-status-tag ${status}`}>{displayLabel}</span>
            </h2>
          </div>
        </div>

        {/* Confidence Dial (Conditionally Rendered) */}
        {hasValidConfidence && (
          <div className="verdict-confidence-meter" aria-label={`Confidence: ${percentage} percent`}>
            <div className="confidence-numeric">{percentage}%</div>
            <div className="confidence-meta">
              <span className="confidence-level-text">
                {confidenceRating ? `${confidenceRating} Confidence` : 'Evaluated Confidence'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Plain Language Explanation */}
      <div className="verdict-explanation-block">
        <div className="explanation-heading">
          <Info size={16} className="explanation-icon" aria-hidden="true" />
          <span>Factual Assessment Summary</span>
        </div>
        <p className="explanation-paragraph">
          {explanation || VERDICT_DESCRIPTIONS[status] || 'No detailed explanation provided for this verification result.'}
        </p>

        {rationale && (
          <div className="confidence-rationale-note">
            <strong>Methodology Note:</strong> {rationale}
          </div>
        )}
      </div>
    </section>
  );
}
