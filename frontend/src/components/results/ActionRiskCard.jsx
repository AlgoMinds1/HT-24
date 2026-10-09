import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

/**
 * ActionRiskCard Component
 * 
 * Explains what a message asks recipient to do (financial transfer, credential entry, medical action, forward chain),
 * assesses potential harm severity, and provides immediate, practical safety steps.
 * 
 * @param {Object} props
 * @param {Object|null} props.actionRisk - Action risk data from VerdictContract
 */
export default function ActionRiskCard({ actionRisk = null }) {
  if (!actionRisk || typeof actionRisk !== 'object') {
    return null; // Gracefully omit if no action-risk evaluation is present
  }

  const {
    requestedAction = '',
    level = 'UNKNOWN',
    safetyAdvice = '',
    reasoning = '',
    category = '',
    warningFlag = ''
  } = actionRisk;

  // Don't render empty card if no substantive fields exist
  if (!requestedAction && !safetyAdvice && !reasoning && !warningFlag && level === 'UNKNOWN') {
    return null;
  }

  const getRiskIcon = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
      case 'HIGH':
        return <ShieldAlert size={26} className="risk-icon risk-icon-severe" aria-hidden="true" />;
      case 'MEDIUM':
        return <AlertTriangle size={26} className="risk-icon risk-icon-medium" aria-hidden="true" />;
      case 'LOW':
        return <ShieldCheck size={26} className="risk-icon risk-icon-low" aria-hidden="true" />;
      case 'UNKNOWN':
      default:
        return <HelpCircle size={26} className="risk-icon risk-icon-unknown" aria-hidden="true" />;
    }
  };

  const getRiskBadgeLabel = (lvl) => {
    switch (lvl) {
      case 'CRITICAL': return 'Critical Threat';
      case 'HIGH': return 'High Risk';
      case 'MEDIUM': return 'Moderate Risk';
      case 'LOW': return 'Low / Safe';
      case 'UNKNOWN':
      default: return 'Risk Unassessed';
    }
  };

  return (
    <section className={`action-risk-card-root risk-level-${level.toLowerCase()}`} aria-label="Action Risk Assessment">
      {/* Top Banner Row */}
      <div className="risk-card-top-banner">
        <div className="risk-header-leading">
          {getRiskIcon(level)}
          <div>
            <div className="risk-supertitle">Recipient Harm & Exploitation Risk</div>
            <div className="risk-title-row">
              <span className={`risk-level-badge level-${level.toLowerCase()}`}>
                {getRiskBadgeLabel(level)}
              </span>
              {category && (
                <span className="risk-category-tag">
                  {category.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {warningFlag && (
          <div className="urgent-warning-banner" role="alert">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{warningFlag}</span>
          </div>
        )}
      </div>

      <div className="risk-details-grid">
        {/* Requested Action */}
        {requestedAction && (
          <div className="risk-column-card requested-action-card">
            <span className="risk-field-label">Message Prompted Action:</span>
            <p className="risk-field-text action-highlight">
              {requestedAction}
            </p>
          </div>
        )}

        {/* Safety Guidance */}
        {safetyAdvice && (
          <div className="risk-column-card safety-advice-card">
            <span className="risk-field-label">
              <Lightbulb size={14} className="accent-icon" aria-hidden="true" />
              <span>Recommended Immediate Action:</span>
            </span>
            <p className="risk-field-text advice-text">
              {safetyAdvice}
            </p>
          </div>
        )}
      </div>

      {/* Rationale / Context if distinct */}
      {reasoning && reasoning !== category && (
        <div className="risk-reasoning-footer">
          <strong>Risk Rationale:</strong> {reasoning}
        </div>
      )}
    </section>
  );
}
