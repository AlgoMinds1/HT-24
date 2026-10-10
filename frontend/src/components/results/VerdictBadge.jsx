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
    label: 'Verified',
    sublabel: 'Supported by credible authoritative evidence',
    className: 'verdict-badge-verified',
    icon: CheckCircle2,
    color: 'var(--verdict-supported)'
  },
  FALSE: {
    label: 'False / Fabricated',
    sublabel: 'Contradicted by verified facts and authoritative records',
    className: 'verdict-badge-false',
    icon: XCircle,
    color: 'var(--verdict-false)'
  },
  PARTLY_SUPPORTED: {
    label: 'Partly True',
    sublabel: 'Mix of genuine facts with misleading extrapolations',
    className: 'verdict-badge-partly',
    icon: AlertTriangle,
    color: 'var(--verdict-partly)'
  },
  OUTDATED: {
    label: 'Outdated',
    sublabel: 'Was valid previously but has expired or been superseded',
    className: 'verdict-badge-outdated',
    icon: Clock,
    color: 'var(--verdict-outdated)'
  },
  CANNOT_CONFIRM: {
    label: 'Unconfirmed',
    sublabel: 'Insufficient reliable evidence to confirm or debunk',
    className: 'verdict-badge-unconfirmed',
    icon: HelpCircle,
    color: 'var(--verdict-unconfirmed)'
  }
};

/**
 * Prominent Verdict Badge Component
 * Displays clear, non-technical verdict with appropriate icon and styling.
 */
export default function VerdictBadge({ status = 'CANNOT_CONFIRM', customLabel = null }) {
  const config = VERDICT_DISPLAY_MAP[status] || VERDICT_DISPLAY_MAP.CANNOT_CONFIRM;
  const IconComponent = config.icon;
  const labelToDisplay = customLabel || config.label;

  return (
    <div className={`prominent-verdict-badge ${config.className}`} role="status">
      <div className="verdict-badge-icon-box">
        <IconComponent size={28} strokeWidth={2.3} aria-hidden="true" />
      </div>
      <div className="verdict-badge-text-box">
        <span className="verdict-badge-category">Official Determination</span>
        <h2 className="verdict-badge-title">{labelToDisplay}</h2>
      </div>
    </div>
  );
}
