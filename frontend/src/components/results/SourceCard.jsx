import React, { useState } from 'react';
import { 
  ExternalLink, 
  ShieldCheck, 
  Calendar, 
  Database, 
  Globe, 
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * SourceCard Component
 * Renders an individual grounded evidence item with provenance, exact quote,
 * classification badge, origin, and external link.
 */
export default function SourceCard({ item, index }) {
  const [expanded, setExpanded] = useState(false);

  const sourceName = item.sourceName || item.source_name || 'Authoritative Source';
  const quoteText = item.quote || item.excerpt || '';
  const dateText = item.date || item.published_date || null;
  const trustTier = item.trustTier || (item.reliability_score ? `${Math.round(item.reliability_score * 100)}% Reliability` : null);
  const url = item.url || null;
  const origin = item.provider || item.origin || (url && url.includes('gov') ? 'Official Gazette' : 'Knowledge Base');

  // Classification stance mapping
  const stance = (item.relation || item.stance || 'CONTEXTUAL').toUpperCase();
  let classification = {
    label: 'Context & Background',
    className: 'badge-contextual'
  };

  if (stance === 'SUPPORTING' || stance === 'SUPPORTS') {
    classification = {
      label: 'Supporting Evidence',
      className: 'badge-supporting'
    };
  } else if (stance === 'CONTRADICTING' || stance === 'REFUTES') {
    classification = {
      label: 'Contradicting Evidence',
      className: 'badge-contradicting'
    };
  } else if (trustTier && trustTier.includes('TIER_1')) {
    classification = {
      label: 'Official Primary Source',
      className: 'badge-official'
    };
  }

  const isLongQuote = quoteText.length > 220;
  const displayedQuote = isLongQuote && !expanded 
    ? `${quoteText.substring(0, 220)}...` 
    : quoteText;

  const hasValidUrl = url && (url.startsWith('http://') || url.startsWith('https://'));

  return (
    <article className="source-card" aria-label={`Source citation ${index + 1}`}>
      {/* Top Header Row */}
      <div className="source-card-header">
        <div className="source-card-title-group">
          <span className="source-index-num">#{index + 1}</span>
          <div>
            <h4 className="source-card-name">{sourceName}</h4>
            <div className="source-metadata-row">
              {dateText && (
                <span className="source-meta-item">
                  <Calendar size={12} aria-hidden="true" />
                  <span>{dateText}</span>
                </span>
              )}
              {origin && (
                <span className="source-origin-chip">
                  <Database size={11} aria-hidden="true" />
                  <span>{origin.replace(/_/g, ' ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <span className={`source-classification-badge ${classification.className}`}>
          {classification.label}
        </span>
      </div>

      {/* Verbatim Excerpt */}
      {quoteText && (
        <div className="source-quote-container">
          <blockquote className="source-quote-text">
            “{displayedQuote}”
          </blockquote>
          {isLongQuote && (
            <button
              type="button"
              className="quote-expand-btn"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              <span>{expanded ? 'Show less' : 'Read full excerpt'}</span>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      )}

      {/* Footer Row */}
      <div className="source-card-footer">
        <div className="source-footer-left">
          {trustTier && (
            <span className="source-trust-pill" title="Evaluated publisher trust tier">
              <ShieldCheck size={13} aria-hidden="true" />
              <span>{trustTier.replace(/_/g, ' ')}</span>
            </span>
          )}
        </div>

        {hasValidUrl ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-external-link"
            title={`Open original source at ${url}`}
          >
            <span>Open Source</span>
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <span className="source-archive-tag">Archived Official Record</span>
        )}
      </div>
    </article>
  );
}
