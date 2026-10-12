import React, { useRef, useEffect } from 'react';
import { 
  ExternalLink, 
  Terminal, 
  Globe, 
  CheckCircle2, 
  ShieldAlert,
  Search,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function LiveBrowserArea() {
  const { investigationState } = useVerification();
  const logContainerRef = useRef(null);

  const { 
    claim, 
    claimMeta, 
    rawInputSnippet, 
    inputType, 
    activeSource, 
    events, 
    status,
    finalVerdict 
  } = investigationState;

  const isCompleted = status === 'completed';
  const verdictLabel = finalVerdict?.verdict || null;
  const confidenceScore = finalVerdict?.confidence?.score 
    ? `${Math.round(finalVerdict.confidence.score * 100)}%` 
    : null;

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events]);

  const getStanceClass = (stance) => {
    if (!stance) return 'stance-context';
    const upper = stance.toUpperCase();
    if (upper === 'REFUTES' || upper === 'CONTRADICTS' || upper === 'FALSE') return 'stance-refutes';
    if (upper === 'SUPPORTS' || upper === 'CORROBORATES' || upper === 'TRUE') return 'stance-supports';
    return 'stance-context';
  };

  return (
    <div className="sandbox-panel-main">
      {/* 1. Claim Header & Determination */}
      <section className="sandbox-card claim-card">
        <div className="claim-card-top">
          <span className="card-section-label">
            <Sparkles size={13} />
            <span>EXTRACTED CLAIM</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {!claim && status === 'running' && (
              <span className="claim-phase-pill">
                <Loader2 size={11} className="spin-loader" />
                <span>Extracting</span>
              </span>
            )}
            <span className="claim-input-type">
              {inputType ? inputType.toUpperCase() : 'TEXT'}
            </span>
          </div>
        </div>

        {!claim && status === 'running' ? (
          <div className="claim-extracting-loader">
            <Loader2 size={18} className="spin-loader" />
            <span className="extracting-text">Extracting atomic claim statement from submitted {inputType || 'content'}...</span>
          </div>
        ) : (
          <h2 className="claim-statement-text">
            {claim || 'Extracting verifiable claim statement...'}
          </h2>
        )}

        {/* If completed, show determination right here neatly */}
        {isCompleted && verdictLabel && (
          <div className="claim-verdict-banner">
            <div className="verdict-banner-inner">
              <span className="verdict-tag-prefix">DETERMINATION:</span>
              <span className={`verdict-tag-pill ${verdictLabel.toLowerCase()}`}>
                {verdictLabel}
              </span>
              {confidenceScore && (
                <span className="verdict-confidence-badge">
                  {confidenceScore} Confidence
                </span>
              )}
            </div>
          </div>
        )}

        {rawInputSnippet && rawInputSnippet !== claim && (
          <p className="claim-raw-forward">
            <span className="raw-lbl">Original forward:</span> “{rawInputSnippet.length > 180 ? rawInputSnippet.slice(0, 180) + '...' : rawInputSnippet}”
          </p>
        )}
      </section>

      {/* 2. Active Source / Evidence Finding (Clean Editorial Card) */}
      <section className="sandbox-card source-inspection-card">
        <div className="card-header-bar">
          <div className="card-header-title">
            <Globe size={15} />
            <span>ACTIVE SOURCE INSPECTION</span>
          </div>

          {activeSource?.url && (
            <a 
              href={activeSource.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="source-external-link"
              title="Open source in new window"
            >
              <span>{activeSource.domain || 'Visit Source'}</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div className="source-inspection-body">
          {activeSource ? (
            <div className="source-dossier-content">
              <div className="source-dossier-headline-row">
                <h3 className="source-dossier-title">
                  {activeSource.title || activeSource.domain || 'Inspected Source'}
                </h3>
                {activeSource.stance && (
                  <span className={`source-stance-pill ${getStanceClass(activeSource.stance)}`}>
                    {activeSource.stance}
                  </span>
                )}
              </div>

              {activeSource.status === 'fetching' ? (
                <div className="source-fetching-loader">
                  <Loader2 size={18} className="spin-loader" />
                  <div className="fetching-text-wrap">
                    <span className="fetching-title">Fetching & Parsing Candidate Source...</span>
                    <span className="fetching-url-sub">{activeSource.url}</span>
                  </div>
                </div>
              ) : activeSource.status === 'blocked' ? (
                <div className="source-protected-box">
                  <ShieldAlert size={16} />
                  <span>
                    Direct scraping restricted by publisher ({activeSource.httpStatus || 403}). Search metadata retained.
                  </span>
                </div>
              ) : (
                <blockquote className="source-quote-box">
                  “{activeSource.excerpt || 'Inspecting content for factual verification...'}”
                </blockquote>
              )}

              <div className="source-footer-meta">
                <span>{activeSource.domain || 'Source Registry'}</span>
                {activeSource.publishedDate && <span> • {activeSource.publishedDate}</span>}
                {activeSource.retrieved_by && <span> • {activeSource.retrieved_by}</span>}
              </div>
            </div>
          ) : (
            <div className="source-awaiting-state">
              {status === 'running' ? (
                <Loader2 size={22} className="spin-loader active-forest" />
              ) : (
                <Search size={20} className="pulse-icon" />
              )}
              <div>
                <p className="awaiting-headline">
                  {status === 'running' 
                    ? 'Dual Agents Querying Live Portals' 
                    : isCompleted 
                    ? 'Evidence Evaluation Finalized' 
                    : 'Awaiting Candidate Sources'}
                </p>
                <p className="awaiting-description">
                  {status === 'running'
                    ? 'Agent 1 (Web Search) and Agent 2 (Fact-Check Tools) are retrieving candidate pages and verified reviews...'
                    : isCompleted 
                    ? 'Select any source or fact-check item on the right to inspect its detailed evidence excerpt.'
                    : 'Candidate sources will be parsed and displayed here in real time.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Live Investigation Log (Quiet, Compact Ticker) */}
      <section className="sandbox-card log-card">
        <div className="card-header-bar">
          <div className="card-header-title">
            <Terminal size={14} />
            <span>INVESTIGATION EVENT LOG</span>
            <span className="log-counter">({events.length})</span>
          </div>
          {status === 'running' && (
            <span className="log-active-tag">
              <span className="live-dot" /> LIVE
            </span>
          )}
        </div>

        <div className="sandbox-log-viewport" ref={logContainerRef}>
          {events.length === 0 ? (
            <div className="log-empty">Waiting for investigation telemetry stream...</div>
          ) : (
            events.map((ev, idx) => {
              const timeStr = ev.timestamp 
                ? new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : `00:00:0${idx}`;

              const agentTag = 
                ev.agent === 'web_research' ? 'AGENT 1' :
                ev.agent === 'fact_check' ? 'AGENT 2' :
                ev.agent === 'synthesis' ? 'SYNTHESIS' : 'SYSTEM';

              return (
                <div key={ev.id || idx} className="log-item-row">
                  <span className="log-item-time">{timeStr}</span>
                  <span className={`log-item-tag ${ev.agent || 'system'}`}>[{agentTag}]</span>
                  <span className="log-item-msg">{ev.message}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
