import React, { useState, useMemo } from 'react';
import { 
  FileSearch, 
  Filter, 
  ShieldAlert, 
  AlertCircle, 
  Info,
  CheckCircle2,
  Database
} from 'lucide-react';
import SourceCard from './SourceCard';

/**
 * EvidenceTab Component
 * Tab 2: Grounded citations, source provenance cards, and classification filters.
 */
export default function EvidenceTab({ contract }) {
  const [activeFilter, setActiveFilter] = useState('ALL');

  const { evidence = [], retrieval_metadata = null, verdict = {} } = contract;
  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  const getItemCategory = (item) => {
    const stance = (item.relation || item.stance || 'CONTEXTUAL').toUpperCase();
    if (stance === 'SUPPORTING' || stance === 'SUPPORTS') return 'SUPPORTING';
    if (stance === 'CONTRADICTING' || stance === 'REFUTES') return 'CONTRADICTING';
    return 'CONTEXTUAL';
  };

  const counts = useMemo(() => {
    return {
      all: safeEvidence.length,
      supporting: safeEvidence.filter(e => getItemCategory(e) === 'SUPPORTING').length,
      contradicting: safeEvidence.filter(e => getItemCategory(e) === 'CONTRADICTING').length,
      contextual: safeEvidence.filter(e => getItemCategory(e) === 'CONTEXTUAL').length
    };
  }, [safeEvidence]);

  const filteredEvidence = useMemo(() => {
    if (activeFilter === 'ALL') return safeEvidence;
    return safeEvidence.filter(e => getItemCategory(e) === activeFilter);
  }, [safeEvidence, activeFilter]);

  return (
    <div id="tab-panel-evidence" role="tabpanel" aria-labelledby="tab-btn-evidence" className="tab-content-panel">
      {/* Evidence Tab Header & Filters */}
      <div className="tab-section-header">
        <div className="tab-header-text">
          <h3 className="tab-section-title">
            Retrieved Authoritative Evidence ({safeEvidence.length})
          </h3>
          <p className="tab-section-subtitle">
            Source citations extracted from curated knowledge bases, gazettes, and fact-checking registries.
          </p>
        </div>

        {/* Filter Buttons */}
        {safeEvidence.length > 0 && (
          <div className="classification-filter-bar" role="group" aria-label="Filter evidence sources">
            <button
              type="button"
              className={`filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ALL')}
            >
              All ({counts.all})
            </button>
            {counts.supporting > 0 && (
              <button
                type="button"
                className={`filter-pill ${activeFilter === 'SUPPORTING' ? 'active' : ''}`}
                onClick={() => setActiveFilter('SUPPORTING')}
              >
                Supporting ({counts.supporting})
              </button>
            )}
            {counts.contradicting > 0 && (
              <button
                type="button"
                className={`filter-pill ${activeFilter === 'CONTRADICTING' ? 'active' : ''}`}
                onClick={() => setActiveFilter('CONTRADICTING')}
              >
                Contradicting ({counts.contradicting})
              </button>
            )}
            {counts.contextual > 0 && (
              <button
                type="button"
                className={`filter-pill ${activeFilter === 'CONTEXTUAL' ? 'active' : ''}`}
                onClick={() => setActiveFilter('CONTEXTUAL')}
              >
                Official / Context ({counts.contextual})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {safeEvidence.length === 0 ? (
        <div className="tab-empty-state-card" role="status">
          <div className="empty-icon-bubble">
            <AlertCircle size={28} className="empty-state-icon" aria-hidden="true" />
          </div>
          <div className="empty-text-wrap">
            <h4 className="empty-title">No Grounded Evidence Found</h4>
            <p className="empty-description">
              A comprehensive search across verified fact-checking records, official government gazettes, and curated knowledge archives yielded no corroborating or refuting citations.
            </p>
            <div className="empty-guideline-note">
              <Info size={14} aria-hidden="true" />
              <span>
                <strong>TruthLens Epistemic Guarantee:</strong> In accordance with our fact-checking protocol, claims without grounded evidence cannot be validated as confirmed, and we never fabricate citations or synthetic links.
              </span>
            </div>
          </div>
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="tab-empty-state-card filtered-empty" role="status">
          <p className="empty-description">
            No evidence items match the selected "{activeFilter.toLowerCase()}" filter.
          </p>
          <button
            type="button"
            className="filter-reset-btn"
            onClick={() => setActiveFilter('ALL')}
          >
            Reset Filter to Show All ({safeEvidence.length})
          </button>
        </div>
      ) : (
        <div className="source-cards-grid">
          {filteredEvidence.map((item, idx) => (
            <SourceCard key={item.id || idx} item={item} index={idx} />
          ))}
        </div>
      )}

      {/* Provider Status Note if available */}
      {retrieval_metadata?.providers_status && (
        <div className="provider-status-strip">
          <Database size={13} aria-hidden="true" />
          <span>
            Retrieval Provider Coverage: {retrieval_metadata.providers_status.map(p => `${p.provider} (${p.status})`).join(' • ')}
          </span>
        </div>
      )}
    </div>
  );
}
