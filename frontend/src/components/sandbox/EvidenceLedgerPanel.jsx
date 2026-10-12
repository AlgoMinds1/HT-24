import React from 'react';
import { Scale, ArrowUpRight, Loader2 } from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function EvidenceLedgerPanel() {
  const { investigationState, setActiveSourcePreview } = useVerification();
  const { evidenceLedger, status } = investigationState;

  const isRunning = status === 'running';

  const getStanceClass = (stance) => {
    const upper = (stance || '').toUpperCase();
    if (upper === 'REFUTES' || upper === 'CONTRADICTS' || upper === 'FALSE') return 'refutes';
    if (upper === 'SUPPORTS' || upper === 'CORROBORATES' || upper === 'TRUE') return 'supports';
    return 'context';
  };

  return (
    <div className="sandbox-evidence-container">
      <div className="evidence-header-row">
        <div className="evidence-title">
          <Scale size={15} />
          <span>Grounded Evidence</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {isRunning && (
            <span className="evidence-live-loader">
              <Loader2 size={11} className="spin-loader" />
              <span>Cross-Referencing</span>
            </span>
          )}
          <span className="evidence-count-tag">
            {evidenceLedger.length} {evidenceLedger.length === 1 ? 'Source' : 'Sources'}
          </span>
        </div>
      </div>

      <div className="evidence-list-scroll">
        {evidenceLedger.length === 0 ? (
          <div className="evidence-quiet-empty">
            {isRunning ? (
              <span className="evidence-loading-inline">
                <Loader2 size={13} className="spin-loader" /> Retrieving and cross-referencing evidence excerpts...
              </span>
            ) : (
              'Evidence citations extracted by Agent 1 and Agent 2 will be cataloged here.'
            )}
          </div>
        ) : (
          evidenceLedger.map((item) => (
            <article 
              key={item.id} 
              className="evidence-card-compact"
              onClick={() => setActiveSourcePreview({
                url: item.url,
                domain: item.domain,
                title: item.title,
                stance: item.stance,
                publishedDate: item.publishedDate,
                excerpt: item.excerpt,
                status: 'completed',
                retrieved_by: item.agent
              })}
            >
              <div className="evidence-card-top">
                <span className={`stance-badge ${getStanceClass(item.stance)}`}>
                  {item.stance || 'CONTEXT'}
                </span>
                <span className="agent-tag">{item.agent}</span>
              </div>

              <div className="evidence-card-headline">
                {item.title || item.domain || 'Primary Source'}
              </div>

              <blockquote className="evidence-card-excerpt">
                “{item.excerpt || 'Verified evidence citation.'}”
              </blockquote>

              <div className="evidence-card-footer">
                <span className="domain-label">{item.domain}</span>
                {item.url && (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="source-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>View Citation</span>
                    <ArrowUpRight size={11} />
                  </a>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
