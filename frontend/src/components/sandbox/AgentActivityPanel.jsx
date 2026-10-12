import React from 'react';
import { 
  Globe2, 
  FileCheck2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function AgentActivityPanel() {
  const { investigationState, setActiveSourcePreview } = useVerification();
  const { agent1, agent2 } = investigationState;

  const renderStatus = (status) => {
    if (status === 'in_progress') {
      return (
        <span className="agent-badge active">
          <Loader2 size={11} className="spin-loader" /> Searching
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="agent-badge completed">
          <CheckCircle2 size={11} /> Ready
        </span>
      );
    }
    if (status === 'empty') {
      return <span className="agent-badge neutral">0 Records</span>;
    }
    if (status === 'failed') {
      return <span className="agent-badge failed">Unavailable</span>;
    }
    return <span className="agent-badge idle">Ready</span>;
  };

  return (
    <div className="sandbox-agents-container">
      {/* Agent 1: Web Research */}
      <div className="agent-block">
        <div className="agent-header-row">
          <div className="agent-title-col">
            <div className="agent-label-pill">AGENT 1</div>
            <h4 className="agent-name">Web Research Agent</h4>
          </div>
          {renderStatus(agent1.status)}
        </div>

        {agent1.query && (
          <div className="agent-query-snippet" title={agent1.query}>
            <span className="lbl">Query:</span> "{agent1.query.length > 60 ? agent1.query.slice(0, 60) + '...' : agent1.query}"
          </div>
        )}

        <div className="agent-sources-list">
          {agent1.domains.length === 0 ? (
            <div className="agent-quiet-status">
              {agent1.status === 'in_progress' ? (
                <span className="agent-loading-inline">
                  <Loader2 size={12} className="spin-loader" /> Searching authoritative portals & live feeds...
                </span>
              ) : 'Authoritative sources will appear here.'}
            </div>
          ) : (
            agent1.domains.map((item, idx) => {
              const isBlocked = item.status === 403 || item.status >= 400;
              return (
                <div 
                  key={idx} 
                  className={`agent-source-row ${isBlocked ? 'blocked' : 'ok'}`}
                  onClick={() => setActiveSourcePreview({
                    url: item.url,
                    domain: item.domain,
                    title: item.title,
                    status: isBlocked ? 'blocked' : 'completed',
                    httpStatus: item.status,
                    excerpt: item.excerpt,
                    retrieved_by: 'Agent 1 (Web Research)'
                  })}
                >
                  <div className="source-info">
                    <span className="source-domain">{item.domain || 'source'}</span>
                    <span className="source-title-truncate">{item.title || item.url}</span>
                  </div>
                  <span className={`status-tag ${isBlocked ? 'blocked' : 'ok'}`}>
                    {isBlocked ? 'Protected' : 'Parsed'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Agent 2: Fact-Check Tools */}
      <div className="agent-block">
        <div className="agent-header-row">
          <div className="agent-title-col">
            <div className="agent-label-pill factcheck">AGENT 2</div>
            <h4 className="agent-name">Fact-Check Agent</h4>
          </div>
          {renderStatus(agent2.status)}
        </div>

        <div className="agent-sources-list">
          {agent2.status === 'in_progress' ? (
            <div className="agent-quiet-status">
              <span className="agent-loading-inline">
                <Loader2 size={12} className="spin-loader" /> Querying Google Fact Check database records...
              </span>
            </div>
          ) : agent2.matches.length === 0 ? (
            <div className="agent-quiet-status">
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              No conflicting records in Google Fact Check database.
            </div>
          ) : (
            agent2.matches.map((record, idx) => (
              <div 
                key={idx} 
                className="agent-source-row ok"
                onClick={() => setActiveSourcePreview({
                  url: record.url,
                  domain: record.publisher,
                  title: `${record.publisher}: ${record.rating}`,
                  stance: record.stance || 'REFUTES',
                  publishedDate: record.date,
                  excerpt: `Rated "${record.rating}" by certified fact-checker ${record.publisher}.`,
                  status: 'completed',
                  retrieved_by: 'Agent 2 (Fact-Check Tools)'
                })}
              >
                <div className="source-info">
                  <span className="source-domain">{record.publisher || 'Fact-Checker'}</span>
                  <span className="source-title-truncate">{record.title}</span>
                </div>
                <span className={`status-tag ${(record.rating || '').toLowerCase().includes('false') ? 'blocked' : 'ok'}`}>
                  {record.rating || 'Verified'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
