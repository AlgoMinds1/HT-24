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

  const getItemRelation = (item) => {
    if (item.relation) return item.relation;
    if (item.stance === 'REFUTES') return 'CONTRADICTING';
    if (item.stance === 'SUPPORTS') return 'SUPPORTING';
    return 'CONTEXTUAL';
  };

  const filteredItems = safeEvidence.filter(item => {
    if (filterRelation === 'ALL') return true;
    return getItemRelation(item) === filterRelation;
  });

  const getRelationBadge = (item) => {
    const relation = getItemRelation(item);
    return (
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        {relation === 'SUPPORTING' && <span className="relation-badge supporting">Supports Claim</span>}
        {relation === 'CONTRADICTING' && <span className="relation-badge contradicting">Refutes Claim</span>}
        {relation === 'CONTEXTUAL' && <span className="relation-badge contextual">Context / Baseline</span>}
        {item.isOfficial && <span className="relation-badge" style={{ background: '#e0e7ff', color: '#1e40af' }}>Official Source</span>}
      </div>
    );
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
              Supporting ({safeEvidence.filter(e => getItemRelation(e) === 'SUPPORTING').length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterRelation === 'CONTRADICTING' ? 'active' : ''}`}
              onClick={() => setFilterRelation('CONTRADICTING')}
            >
              Contradicting ({safeEvidence.filter(e => getItemRelation(e) === 'CONTRADICTING').length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterRelation === 'CONTEXTUAL' ? 'active' : ''}`}
              onClick={() => setFilterRelation('CONTEXTUAL')}
            >
              Context ({safeEvidence.filter(e => getItemRelation(e) === 'CONTEXTUAL').length})
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
            const sourceName = item.sourceName || item.source_name;
            const quoteText = item.quote || item.excerpt;
            const dateText = item.date || item.published_date;
            const trustText = item.trustTier || (item.reliability_score ? `${Math.round(item.reliability_score * 100)}% Trust` : null);
            const relation = getItemRelation(item);
            const hasValidUrl = item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'));

            return (
              <article key={item.id || idx} className="evidence-item-card">
                <div className="evidence-item-top">
                  <div className="evidence-source-info">
                    {sourceName && <h4 className="evidence-source-name">{sourceName}</h4>}
                    {dateText && (
                      <span className="evidence-date">
                        <Calendar size={12} aria-hidden="true" />
                        <span>{dateText}</span>
                      </span>
                    )}
                  </div>
                  {getRelationBadge(item)}
                </div>

                {quoteText && (
                  <blockquote className="evidence-quote-text">
                    “{quoteText}”
                  </blockquote>
                )}

                <div className="evidence-item-footer">
                  {trustText && (
                    <span className="evidence-trust-tier">
                      <ShieldCheck size={13} aria-hidden="true" />
                      <span>{trustText}</span>
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
