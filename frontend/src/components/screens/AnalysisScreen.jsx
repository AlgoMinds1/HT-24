import React, { useState } from 'react';
import { 
  Globe2, 
  Layers, 
  RotateCcw, 
  AlertTriangle, 
  XCircle 
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import SandboxHeader from '../sandbox/SandboxHeader';
import LiveBrowserArea from '../sandbox/LiveBrowserArea';
import AgentActivityPanel from '../sandbox/AgentActivityPanel';
import EvidenceLedgerPanel from '../sandbox/EvidenceLedgerPanel';

export default function AnalysisScreen() {
  const { 
    investigationState, 
    startVerification, 
    goToDashboard,
    error 
  } = useVerification();

  const [mobileTab, setMobileTab] = useState('findings'); // 'findings' | 'dossier'
  const { status } = investigationState;
  const isAborted = status === 'aborted';
  const isFailed = status === 'failed';

  return (
    <div className="sandbox-fullscreen-container">
      {/* 1. Slim, Clean Control Header */}
      <SandboxHeader />

      {/* 2. Error / Abort Notification (Only displayed if interrupted) */}
      {isAborted && (
        <div className="sandbox-notice-banner aborted" role="alert">
          <div className="notice-text">
            <XCircle size={16} />
            <span>Investigation cancelled by user. Background tasks stopped.</span>
          </div>
          <div className="notice-actions">
            <button type="button" className="btn-notice-quiet" onClick={goToDashboard}>
              Return to Studio
            </button>
            <button type="button" className="btn-notice-primary" onClick={startVerification}>
              <RotateCcw size={12} /> Restart
            </button>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="sandbox-notice-banner failed" role="alert">
          <div className="notice-text">
            <AlertTriangle size={16} />
            <span>{error?.message || 'Verification halted due to upstream network issue.'}</span>
          </div>
          <div className="notice-actions">
            <button type="button" className="btn-notice-quiet" onClick={goToDashboard}>
              Return to Studio
            </button>
            <button type="button" className="btn-notice-primary" onClick={startVerification}>
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* 3. Mobile View Switcher */}
      <div className="sandbox-mobile-nav" role="tablist">
        <button 
          type="button" 
          role="tab"
          aria-selected={mobileTab === 'findings'}
          className={`mobile-nav-btn ${mobileTab === 'findings' ? 'active' : ''}`}
          onClick={() => setMobileTab('findings')}
        >
          <Globe2 size={14} />
          <span>Claim & Findings</span>
        </button>

        <button 
          type="button" 
          role="tab"
          aria-selected={mobileTab === 'dossier'}
          className={`mobile-nav-btn ${mobileTab === 'dossier' ? 'active' : ''}`}
          onClick={() => setMobileTab('dossier')}
        >
          <Layers size={14} />
          <span>Agents & Evidence</span>
        </button>
      </div>

      {/* 4. Clean 2-Column Balanced Workspace */}
      <main className="sandbox-two-column-grid">
        {/* Left Column: Claim, Active Finding, Event Ticker (~52%) */}
        <div className={`sandbox-grid-col col-findings ${mobileTab === 'findings' ? 'mob-show' : 'mob-hide'}`}>
          <LiveBrowserArea />
        </div>

        {/* Right Column: Agents Status & Evidence Ledger (~48%) */}
        <div className={`sandbox-grid-col col-dossier ${mobileTab === 'dossier' ? 'mob-show' : 'mob-hide'}`}>
          <div className="sandbox-card dossier-card">
            <AgentActivityPanel />
            <div className="dossier-divider" />
            <EvidenceLedgerPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
