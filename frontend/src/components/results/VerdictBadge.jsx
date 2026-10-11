import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  HelpCircle 
} from 'lucide-react';

export const VERDICT_DISPLAY_MAP = {
  VERIFIED: {
    label: 'Verified Authentic',
    statusTag: 'OFFICIAL RECORD CONFIRMED',
    sublabel: 'Fully corroborated by credible authoritative evidence & official gazettes',
    className: 'verdict-hero-verified',
    icon: CheckCircle2,
    accentColor: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.25)'
  },
  FALSE: {
    label: 'False / Fabricated',
    statusTag: 'DEBUNKED MISINFORMATION',
    sublabel: 'Contradicted by verified facts, scientific consensus, or known scams',
    className: 'verdict-hero-false',
    icon: XCircle,
    accentColor: '#E11D48',
    glowColor: 'rgba(225, 29, 72, 0.25)'
  },
  PARTLY_SUPPORTED: {
    label: 'Partly True',
    statusTag: 'MISLEADING EXTRAPOLATION',
    sublabel: 'Contains genuine real-world elements mixed with inaccurate claims',
    className: 'verdict-hero-partly',
    icon: AlertTriangle,
    accentColor: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.25)'
  },
  OUTDATED: {
    label: 'Outdated & Expired',
    statusTag: 'HISTORICAL ANNOUNCEMENT',
    sublabel: 'Was valid in a past cycle (2021) but has concluded or been superseded',
    className: 'verdict-hero-outdated',
    icon: Clock,
    accentColor: '#B45309',
    glowColor: 'rgba(180, 83, 9, 0.25)'
  },
  CANNOT_CONFIRM: {
    label: 'Unconfirmed',
    statusTag: 'INSUFFICIENT EVIDENCE',
    sublabel: 'Insufficient authoritative evidence currently exists to verify or refute',
    className: 'verdict-hero-unconfirmed',
    icon: HelpCircle,
    accentColor: '#6D28D9',
    glowColor: 'rgba(109, 40, 217, 0.25)'
  }
};

/**
 * Eye-Catching Hero Verdict Badge Component
 * Features large typography, glowing icon halo, status tag, and explanatory subtitle.
 */
export default function VerdictBadge({ 
  status = 'CANNOT_CONFIRM', 
  customLabel = null,
  confidence = null,
  confidenceRating = null 
}) {
  const config = VERDICT_DISPLAY_MAP[status] || VERDICT_DISPLAY_MAP.CANNOT_CONFIRM;
  const IconComponent = config.icon;
  const labelToDisplay = customLabel || config.label;

  const numericPercent = typeof confidence === 'number' && !isNaN(confidence)
    ? (confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence))
    : (confidenceRating === 'HIGH' ? 95 : (confidenceRating === 'MEDIUM' ? 60 : (confidenceRating === 'LOW' ? 35 : null)));

  return (
    <div className={`verdict-hero-badge ${config.className}`} role="status">
      <div className="verdict-hero-top-row">
        <div className="verdict-hero-icon-halo">
          <IconComponent size={28} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="verdict-hero-status-tag">{config.statusTag}</span>
          {numericPercent !== null && (
            <span 
              className="verdict-hero-confidence-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                background: 'rgba(255, 255, 255, 0.95)',
                color: config.accentColor,
                border: `1px solid ${config.accentColor}33`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
              }}
              title="Calibrated Verification Confidence Score"
            >
              {numericPercent}% Confidence {confidenceRating ? `(${confidenceRating})` : ''}
            </span>
          )}
        </div>
      </div>

      <div className="verdict-hero-text-block">
        <h2 className="verdict-hero-main-title">{labelToDisplay}</h2>
        <p className="verdict-hero-sublabel">{config.sublabel}</p>
      </div>
    </div>
  );
}
