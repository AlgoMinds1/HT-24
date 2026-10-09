import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  HelpCircle, 
  ExternalLink, 
  ShieldAlert, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Check, 
  Copy,
  BookOpen,
  Cpu,
  Share2
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function ResultScreen() {
  const { resultData, resetVerification } = useVerification();
  const [copied, setCopied] = useState(false);
  const [stressOpen, setStressOpen] = useState(true);

  if (!resultData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>No verification data available.</p>
        <button className="btn-primary" onClick={resetVerification} style={{ marginTop: '1rem' }}>
          Back to Input
        </button>
      </div>
    );
  }

  const {
    input,
    claim,
    verdict,
    confidence,
    plain_explanation,
    evidence,
    stress_test,
    truth_timeline,
    action_risk
  } = resultData;

  const getVerdictIcon = (v) => {
    switch (v) {
      case 'SUPPORTED': return <CheckCircle size={28} />;
      case 'FALSE': return <XCircle size={28} />;
      case 'OUTDATED': return <Clock size={28} />;
      case 'PARTLY_TRUE': return <AlertTriangle size={28} />;
      case 'UNCONFIRMED': return <HelpCircle size={28} />;
      default: return <HelpCircle size={28} />;
    }
  };

  const copySummary = () => {
    const summaryText = `[TruthLens Verdict: ${verdict}]\nClaim: "${claim}"\nConfidence: ${(confidence.score * 100).toFixed(0)}% (${confidence.rating})\n\nExplanation: ${plain_explanation}\n\nAdvised Action: ${action_risk.recommended_action}`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="result-screen-wrapper">
      {/* Header Summary Glass Card */}
      <div className="glass-card result-header-card">
        <div className="verdict-hero-banner">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Final Verification Verdict
            </span>
            <div style={{ marginTop: '0.35rem' }}>
              <span className={`verdict-badge-large ${verdict}`}>
                {getVerdictIcon(verdict)}
                <span>{verdict.replace('_', ' ')}</span>
              </span>
            </div>
          </div>

          <div className="confidence-box">
            <div className="confidence-score-dial">
              <span className="confidence-val">{(confidence.score * 100).toFixed(0)}%</span>
              <span className="confidence-tag">{confidence.rating} Confidence</span>
            </div>
          </div>
        </div>

        {/* Action Risk Banner */}
        <div className={`action-risk-banner ${action_risk.risk_level}`}>
          <ShieldAlert size={26} color={action_risk.risk_level === 'CRITICAL' || action_risk.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b'} />
          <div style={{ flex: 1 }}>
            <div className="risk-header">
              <strong style={{ fontSize: '0.95rem' }}>Action Risk Advisory</strong>
              <span className="risk-level-tag">{action_risk.risk_level} • {action_risk.risk_category.replace('_', ' ')}</span>
            </div>
            {action_risk.warning_flag && (
              <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                ⚠️ {action_risk.warning_flag}
              </p>
            )}
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {action_risk.recommended_action}
            </p>
          </div>
        </div>

        {/* Plain Explanation */}
        <div className="explanation-section">
          <div className="section-label">
            <BookOpen size={16} />
            <span>Plain English Explanation</span>
          </div>
          <p className="explanation-text">{plain_explanation}</p>
        </div>

        {/* Extracted Claim & Input Details */}
        <div className="claim-card">
          <div className="section-label">
            <Cpu size={16} />
            <span>Extracted Core Claim</span>
          </div>
          <p className="claim-quote">"{claim}"</p>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <strong>Source Platform:</strong> {input.source_platform || 'Forward'} • <strong>Format:</strong> {input.media_type || 'text'}
          </div>
        </div>
      </div>

      {/* Grid: Authoritative Evidence & Truth Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Evidence Sources */}
        <div className="glass-card">
          <div className="section-label">
            <CheckCircle size={16} />
            <span>Authoritative Evidence & Stances ({evidence.length})</span>
          </div>
          <div className="evidence-grid" style={{ gridTemplateColumns: '1fr' }}>
            {evidence.map((item, idx) => (
              <div key={idx} className="evidence-card">
                <div className="evidence-header">
                  <span className="evidence-source">{item.source_name}</span>
                  <span className={`stance-pill ${item.stance}`}>{item.stance}</span>
                </div>
                <p className="evidence-quote">"{item.excerpt}"</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  {item.reliability_score && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Reliability: {(item.reliability_score * 100).toFixed(0)}%
                    </span>
                  )}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="evidence-link">
                    <span>Source Record</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Truth Timeline */}
        <div className="glass-card">
          <div className="section-label">
            <Calendar size={16} />
            <span>Truth Timeline & Historical Context</span>
          </div>
          <div className="timeline-container">
            {truth_timeline.map((event, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-date">{event.date}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {event.event}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <strong>Impact:</strong> {event.significance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stress-Test & Counter-Evidence Analysis */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div 
          className="section-label" 
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
          onClick={() => setStressOpen(!stressOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>Stress-Test & Adversarial Robustness Check</span>
          </div>
          {stressOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {stressOpen && (
          <div className="stress-box">
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              <strong>Robustness Summary:</strong> {stress_test.robustness_summary}
            </p>
            
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Counter-Arguments Evaluated:</span>
              <ul className="stress-list">
                {stress_test.counter_arguments_checked.map((ca, idx) => (
                  <li key={idx} className="stress-item">
                    <span>•</span>
                    <span>{ca}</span>
                  </li>
                ))}
              </ul>
            </div>

            {stress_test.edge_cases_identified && stress_test.edge_cases_identified.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Edge Cases & Nuances:</span>
                <ul className="stress-list">
                  {stress_test.edge_cases_identified.map((ec, idx) => (
                    <li key={idx} className="stress-item">
                      <span>•</span>
                      <span>{ec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingBottom: '2rem' }}>
        <button
          className="tab-btn"
          onClick={copySummary}
          style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', padding: '0.75rem 1.25rem' }}
        >
          {copied ? <Check size={18} color="var(--verdict-supported)" /> : <Copy size={18} />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Verdict Summary'}</span>
        </button>

        <button
          className="btn-primary"
          onClick={resetVerification}
        >
          <RotateCcw size={18} />
          <span>Verify Another Forward</span>
        </button>
      </div>
    </div>
  );
}
