import React, { useState } from 'react';
import { 
  CheckCircle, 
  ExternalLink, 
  ShieldCheck, 
  Calendar, 
  FileSearch, 
  Filter,
  AlertCircle
} from 'lucide-react';

/**
 * EvidenceList Component
 * 
 * Traceable citations and evidence excerpts supporting or contradicting the claim.
 * Includes interactive filtering, conditional metadata display, safe external link navigation,
 * and a neutral empty-state when evidence is absent.
 * 
 * @param {Object} props
 * @param {Array} props.evidence - List of EvidenceItem objects from VerdictContract
 */
export default function EvidenceList({ evidence = [] }) {
  const [filterRelation, setFilterRelation] = useState('ALL');

  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  const filteredItems = safeEvidence.filter(item => {
    if (filterRelation === 'ALL') return true;
    return item.relation === filterRelation;
  });

  const getRelationBadge = (relation) => {
    switch (relation) {
      case 'SUPPORTING':
        return <span className="relation-badge supporting">Supports Claim</span>;
      case 'CONTRADICTING':
        return <span className="relation-badge contradicting">Refutes Claim</span>;
      case 'CONTEXTUAL':
      default:
        return <span className="relation-badge contextual">Context / Baseline</span>;
    }
  };

  return (
    <section className="evidence-section-container" aria-label="Authoritative Evidence Sources">
      <div className="evidence-section-header">
        <div className="section-title-wrap">
          <FileSearch size={18} className="accent-icon" aria-hidden="true" />
          <h3 className="section-heading">
            Grounded Evidence & Source Citations ({safeEvidence.length})
          </h3>
        </div>

        {/* Filter Bar */}
        {safeEvidence.length > 0 && (
          <div className="relation-filter-bar" role="group" aria-label="Filter evidence by relation">
            <button
              type="button"
              className={`filter-btn ${filterRelation === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterRelation('ALL')}
            >
              All ({safeEvidence.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterRelation === 'SUPPORTING' ? 'active' : ''}`}
              onClick={() => setFilterRelation('SUPPORTING')}
            >
              Supporting ({safeEvidence.filter(e => e.relation === 'SUPPORTING').length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterRelation === 'CONTRADICTING' ? 'active' : ''}`}
              onClick={() => setFilterRelation('CONTRADICTING')}
            >
              Contradicting ({safeEvidence.filter(e => e.relation === 'CONTRADICTING').length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterRelation === 'CONTEXTUAL' ? 'active' : ''}`}
              onClick={() => setFilterRelation('CONTEXTUAL')}
            >
              Context ({safeEvidence.filter(e => e.relation === 'CONTEXTUAL').length})
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {safeEvidence.length === 0 ? (
        <div className="evidence-empty-card" role="status">
          <AlertCircle size={22} className="empty-icon" aria-hidden="true" />
          <div>
            <strong>No external evidence items available</strong>
            <p className="empty-text">
              No corroborating or refuting source excerpts were retrieved for this specific claim. 
              The verdict reflects internal pattern recognition or user-submitted context.
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="evidence-empty-card" role="status">
          <p className="empty-text">No evidence items match the selected "{filterRelation}" filter.</p>
        </div>
      ) : (
        <div className="evidence-items-grid">
          {filteredItems.map((item, idx) => {
            const hasSource = Boolean(item.sourceName);
            const hasQuote = Boolean(item.quote);
            const hasDate = Boolean(item.date);
            const hasTrust = Boolean(item.trustTier);
            const hasValidUrl = item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'));

            return (
              <article key={item.id || idx} className="evidence-item-card">
                <div className="evidence-item-top">
                  <div className="evidence-source-info">
                    {hasSource && <h4 className="evidence-source-name">{item.sourceName}</h4>}
                    {hasDate && (
                      <span className="evidence-date">
                        <Calendar size={12} aria-hidden="true" />
                        <span>{item.date}</span>
                      </span>
                    )}
                  </div>
                  {getRelationBadge(item.relation)}
                </div>

                {hasQuote && (
                  <blockquote className="evidence-quote-text">
                    “{item.quote}”
                  </blockquote>
                )}

                <div className="evidence-item-footer">
                  {hasTrust && (
                    <span className="evidence-trust-tier">
                      <ShieldCheck size={13} aria-hidden="true" />
                      <span>{item.trustTier}</span>
                    </span>
                  )}

                  {hasValidUrl ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="evidence-source-link"
                    >
                      <span>Open Source</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="evidence-unlinked-tag">Official Archive Record</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
