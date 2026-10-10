import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

const STAGES = [
  {
    index: 0,
    title: '1. Ingesting & Validating Payload',
    description: 'Verifying MIME signatures, normalizing text/media, and extracting core forward.'
  },
  {
    index: 1,
    title: '2. Extracting Atomic Claim',
    description: 'Isolating the core verifiable proposition and identifying temporal markers.'
  },
  {
    index: 2,
    title: '3. Cross-Referencing Evidence',
    description: 'Searching authoritative primary sources, fact-checking records, and temporal archives.'
  },
  {
    index: 3,
    title: '4. Synthesizing Evidence Verdict',
    description: 'Executing adversarial contradiction checks and action-risk scoring.'
  }
];

export default function AnalysisScreen() {
  const { 
    currentStepIndex, 
    error, 
    resetVerification, 
    startVerification,
    setScreen
  } = useVerification();

  if (error) {
    return (
      <div className="analysis-page-container">
        <div className="analysis-dossier-card" role="alert" style={{ borderColor: 'var(--color-verdict-false)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-verdict-false-bg)', color: 'var(--color-verdict-false)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <AlertCircle size={28} />
          </div>

          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-ink)', marginBottom: '0.75rem' }}>
            Verification Interrupted
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--color-ink-secondary)', marginBottom: '1.5rem', lineHeight: 1.55 }}>
            {error}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="btn-forest"
              onClick={startVerification}
            >
              <RotateCcw size={15} /> Retry Verification
            </button>
            <button
              type="button"
              className="btn-secondary-quiet"
              onClick={() => setScreen('dashboard')}
            >
              <ArrowLeft size={15} /> Return to Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-page-container">
      <div className="analysis-dossier-card">
        
        {/* Botanical Pulse Icon */}
        <div className="analysis-spinner-botanical">
          <svg viewBox="0 0 32 32" fill="none" style={{ width: '100%', height: '100%' }}>
            <path d="M16 4C9.5 4 4 9.5 4 16C4 22.5 9.5 28 16 28C22.5 28 28 22.5 28 16C28 9.5 22.5 4 16 4Z" stroke="var(--color-forest)" strokeWidth="2" />
            <path d="M10 20C11.5 14 16 10 22 10C20.5 16 16 20 10 20Z" fill="var(--color-sage-light)" stroke="var(--color-forest)" strokeWidth="1.5" />
          </svg>
        </div>

        <span className="section-eyebrow">FORENSIC CLAIM EVALUATION</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
          Examining Evidence Dossier
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-secondary)', maxWidth: '480px', margin: '0 auto 2rem' }}>
          Grounding assertions in primary source citations and running adversarial contradiction checks.
        </p>

        {/* 4 Stages Progression */}
        <div className="analysis-stages-list">
          {STAGES.map((stage) => {
            const isCompleted = currentStepIndex > stage.index;
            const isCurrent = currentStepIndex === stage.index;

            return (
              <div 
                key={stage.index} 
                className={`stage-row ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                style={{
                  border: isCurrent ? '1px solid var(--color-forest)' : '1px solid var(--color-border)',
                  background: isCurrent ? 'var(--color-sage-surface)' : isCompleted ? 'var(--color-paper-light)' : 'transparent'
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {isCompleted ? (
                    <CheckCircle2 size={18} color="var(--color-forest)" />
                  ) : isCurrent ? (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--color-forest)', margin: '2px' }} />
                  ) : (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid var(--color-border-strong)', margin: '2px' }} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isCurrent ? 600 : 500, color: 'var(--color-ink)' }}>
                    {stage.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-muted)' }}>
                    {stage.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-secondary-quiet"
          onClick={() => {
            resetVerification();
            setScreen('dashboard');
          }}
          style={{ fontSize: '0.8125rem' }}
        >
          <XCircle size={14} /> Abort Verification
        </button>

      </div>
    </div>
  );
}
