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
export default function VerdictBadge({ status = 'CANNOT_CONFIRM', customLabel = null }) {
  const config = VERDICT_DISPLAY_MAP[status] || VERDICT_DISPLAY_MAP.CANNOT_CONFIRM;
  const IconComponent = config.icon;
  const labelToDisplay = customLabel || config.label;

  return (
    <div className={`verdict-hero-badge ${config.className}`} role="status">
      <div className="verdict-hero-top-row">
        <div className="verdict-hero-icon-halo">
          <IconComponent size={28} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <span className="verdict-hero-status-tag">{config.statusTag}</span>
      </div>

      <div className="verdict-hero-text-block">
        <h2 className="verdict-hero-main-title">{labelToDisplay}</h2>
        <p className="verdict-hero-sublabel">{config.sublabel}</p>
      </div>
    </div>
  );
}
