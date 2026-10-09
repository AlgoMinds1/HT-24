import React, { useState } from 'react';
import { 
  GitCompare, 
  AlertOctagon, 
  Check, 
  X, 
  HelpCircle, 
  MinusCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  SearchCheck,
  CheckCircle2
} from 'lucide-react';

/**
 * StressTestPanel Component
 * 
 * Exposes multi-path adversarial verification checks, independent sources investigated,
 * edge cases tested, and highlights divergent verification paths / conflict notes.
 * 
 * @param {Object} props
 * @param {Object} props.stressTest - Stress test data from VerdictContract
 */
export default function StressTestPanel({ stressTest = {} }) {
  const [isOpen, setIsOpen] = useState(true);

  const {
    paths = [],
    conflictNote = null,
    summary = null,
    counterArguments = [],
    edgeCases = []
  } = stressTest;

  const getPathStatusBadge = (status) => {
    switch (status) {
      case 'SUPPORT':
        return (
          <span className="path-status-pill support">
            <Check size={12} aria-hidden="true" />
            <span>Support</span>
          </span>
        );
      case 'CONTRADICTION':
        return (
          <span className="path-status-pill contradiction">
            <X size={12} aria-hidden="true" />
            <span>Contradiction</span>
          </span>
        );
      case 'INCONCLUSIVE':
        return (
          <span className="path-status-pill inconclusive">
            <HelpCircle size={12} aria-hidden="true" />
            <span>Inconclusive</span>
          </span>
        );
      case 'NOT_RUN':
        return (
          <span className="path-status-pill not-run">
            <MinusCircle size={12} aria-hidden="true" />
            <span>Not Run</span>
          </span>
        );
      case 'ERROR':
        return (
          <span className="path-status-pill error">
            <AlertOctagon size={12} aria-hidden="true" />
            <span>Path Error</span>
          </span>
        );
      default:
        return (
          <span className="path-status-pill inconclusive">
            <span>{status}</span>
          </span>
        );
    }
  };

  const hasContent = paths.length > 0 || conflictNote || summary || counterArguments.length > 0;

  if (!hasContent) {
    return (
      <section className="stress-panel-container empty" aria-label="Verification Stress Test">
        <div className="stress-panel-header">
          <div className="section-title-wrap">
            <GitCompare size={18} className="accent-icon" aria-hidden="true" />
            <h3 className="section-heading">Multi-Path Verification Stress Test</h3>
          </div>
        </div>
        <p className="stress-empty-note">
          No independent adversarial stress-test paths were recorded for this evaluation.
        </p>
      </section>
    );
  }

  return (
    <section className="stress-panel-container" aria-label="Verification Stress Test">
      <div 
        className="stress-panel-header interactive"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); } }}
        aria-expanded={isOpen}
      >
        <div className="section-title-wrap">
          <GitCompare size={18} className="accent-icon" aria-hidden="true" />
          <h3 className="section-heading">
            Adversarial Stress Test & Multi-Path Investigation
          </h3>
          {paths.length > 0 && (
            <span className="paths-count-badge">{paths.length} Paths Evaluated</span>
          )}
        </div>

        <button 
          type="button" 
          className="panel-toggle-btn"
          aria-label={isOpen ? 'Collapse stress test panel' : 'Expand stress test panel'}
        >
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="stress-panel-body">
          {/* Conflict Note Banner (if paths conflict or explicit note exists) */}
          {conflictNote && (
            <div className="stress-conflict-banner" role="alert">
              <AlertTriangle size={20} className="conflict-icon" aria-hidden="true" />
              <div>
                <strong className="conflict-title">Investigation Disagreement Detected</strong>
                <p className="conflict-text">{conflictNote}</p>
              </div>
            </div>
          )}

          {/* Robustness Summary */}
          {summary && (
            <div className="stress-summary-box">
              <span className="summary-field-title">Robustness & Nuance Assessment:</span>
              <p className="summary-field-content">{summary}</p>
            </div>
          )}

          {/* Verification Paths Grid */}
          {paths.length > 0 && (
            <div className="stress-paths-wrapper">
              <span className="paths-grid-title">Independent Investigative Angles:</span>
              <div className="stress-paths-grid">
                {paths.map((p, idx) => (
                  <div key={p.id || idx} className={`path-card path-status-${p.status.toLowerCase()}`}>
                    <div className="path-card-top">
                      <span className="path-name">{p.name}</span>
                      {getPathStatusBadge(p.status)}
                    </div>
                    {p.description && (
                      <p className="path-description">{p.description}</p>
                    )}
                    {p.note && (
                      <div className="path-note">
                        <strong>Outcome:</strong> {p.note}
                      </div>
                    )}
                    {p.sourceName && (
                      <span className="path-source-tag">Target: {p.sourceName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Counter Arguments Checked */}
          {counterArguments.length > 0 && (
            <div className="stress-subgroup">
              <span className="subgroup-label">Counter-Arguments Systematically Checked:</span>
              <ul className="stress-bullet-list">
                {counterArguments.map((ca, idx) => (
                  <li key={idx} className="stress-bullet-item">
                    <span className="bullet-marker">•</span>
                    <span>{ca}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Edge Cases Identified */}
          {edgeCases.length > 0 && (
            <div className="stress-subgroup">
              <span className="subgroup-label">Contextual Edge Cases Identified:</span>
              <ul className="stress-bullet-list">
                {edgeCases.map((ec, idx) => (
                  <li key={idx} className="stress-bullet-item">
                    <span className="bullet-marker">•</span>
                    <span>{ec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
