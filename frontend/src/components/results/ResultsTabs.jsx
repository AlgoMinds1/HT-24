import React from 'react';
import { 
  FileText, 
  FileSearch, 
  GitCompare, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

export const RESULTS_TAB_KEYS = {
  OVERVIEW: 'overview',
  EVIDENCE: 'evidence',
  INVESTIGATION: 'investigation',
  SAFETY: 'safety'
};

/**
 * ResultsTabs Component
 * Accessible, responsive 4-tab bar navigation.
 */
export default function ResultsTabs({
  activeTab,
  onTabChange,
  evidenceCount = 0,
  hasSafetyRisk = false
}) {
  const tabs = [
    {
      key: RESULTS_TAB_KEYS.OVERVIEW,
      label: 'Overview',
      icon: FileText
    },
    {
      key: RESULTS_TAB_KEYS.EVIDENCE,
      label: 'Evidence & Sources',
      icon: FileSearch,
      badge: evidenceCount > 0 ? evidenceCount : null
    },
    {
      key: RESULTS_TAB_KEYS.INVESTIGATION,
      label: 'Investigation',
      icon: GitCompare
    },
    {
      key: RESULTS_TAB_KEYS.SAFETY,
      label: 'Safety & Feedback',
      icon: ShieldCheck,
      alertDot: hasSafetyRisk
    }
  ];

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % tabs.length;
      onTabChange(tabs[nextIdx].key);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + tabs.length) % tabs.length;
      onTabChange(tabs[prevIdx].key);
    }
  };

  return (
    <nav className="results-tab-bar" role="tablist" aria-label="Verification Report Views">
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.key;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            id={`tab-btn-${tab.key}`}
            aria-selected={isActive}
            aria-controls={`tab-panel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            className={`tab-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            <IconComponent size={16} className="tab-nav-icon" aria-hidden="true" />
            <span className="tab-nav-label">{tab.label}</span>

            {/* Evidence Count Pill */}
            {tab.badge !== null && tab.badge !== undefined && (
              <span className={`tab-nav-count ${isActive ? 'active-count' : ''}`}>
                {tab.badge}
              </span>
            )}

            {/* Safety Risk Alert Pip */}
            {tab.alertDot && (
              <span className="tab-nav-alert-pip" title="Safety advisory active" aria-label="Warning active" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
