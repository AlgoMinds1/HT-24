import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  XCircle, 
  RotateCcw, 
  Copy, 
  Check,
  Loader2
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function SandboxHeader() {
  const { 
    investigationState, 
    abortCurrentVerification, 
    resetVerification,
    goToResult,
    goToDashboard,
    isMockMode
  } = useVerification();

  const [copiedId, setCopiedId] = useState(false);
  const status = investigationState.status;
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isAborted = status === 'aborted';
  const isFailed = status === 'failed';

  const verificationId = investigationState.verificationId || 'live-session';

  const handleCopyId = () => {
    if (!verificationId) return;
    navigator.clipboard?.writeText(verificationId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <header className="sandbox-header-bar">
      <div className="sandbox-header-left">
        <button 
          type="button" 
          className="sandbox-btn-back" 
          onClick={goToDashboard}
        >
          <ArrowLeft size={15} />
          <span>Studio</span>
        </button>

        <div className="sandbox-title-wrap">
          <h1 className="sandbox-main-title">Live Investigation Sandbox</h1>
          <div className="sandbox-meta-row">
            <span className="sandbox-status-indicator" data-status={status}>
              {isRunning ? (
                <Loader2 size={12} className="spin-loader" />
              ) : (
                <span className="pulse-dot" />
              )}
              <span>
                {isRunning ? 'Investigating Claim...' : 
                 isCompleted ? 'Investigation Complete' : 
                 isAborted ? 'Aborted' : 'Ready'}
              </span>
            </span>

            <span className="sandbox-id-badge" onClick={handleCopyId} title="Copy session ID">
              <code>{verificationId.slice(0, 14)}</code>
              {copiedId ? <Check size={11} color="var(--color-forest)" /> : <Copy size={11} />}
            </span>
          </div>
        </div>
      </div>

      <div className="sandbox-header-actions">
        {isRunning && (
          <button 
            type="button" 
            className="sandbox-btn-abort" 
            onClick={abortCurrentVerification}
          >
            <XCircle size={14} />
            <span>Abort</span>
          </button>
        )}

        {isFailed && (
          <button 
            type="button" 
            className="sandbox-btn-retry" 
            onClick={resetVerification}
          >
            <RotateCcw size={14} />
            <span>Retry</span>
          </button>
        )}

        {isCompleted && (
          <button 
            type="button" 
            className="sandbox-btn-view-verdict" 
            onClick={goToResult}
          >
            <span>View Full Verdict Report</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </header>
  );
}
