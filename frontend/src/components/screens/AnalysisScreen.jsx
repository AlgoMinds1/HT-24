import React from 'react';
import { 
  FileSearch, 
  Search, 
  Scale, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert 
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { ANALYSIS_STEPS } from '../../services/verificationService';

export default function AnalysisScreen() {
  const { currentStepIndex } = useVerification();

  const getStepIcon = (index, isActive, isCompleted) => {
    if (isCompleted) {
      return <CheckCircle2 size={18} />;
    }
    if (isActive) {
      return <Loader2 size={18} className="animate-spin" />;
    }
    switch (index) {
      case 0: return <FileSearch size={16} />;
      case 1: return <Search size={16} />;
      case 2: return <Scale size={16} />;
      case 3: return <ShieldAlert size={16} />;
      default: return index + 1;
    }
  };

  return (
    <div className="analysis-container">
      <div className="glass-card" style={{ padding: '2.5rem' }}>
        <div className="analysis-radar">
          <Loader2 size={36} color="var(--accent-cyan)" className="animate-spin" />
        </div>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Verification Pipeline In Progress
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto' }}>
          TruthLens multi-agent engine is isolating factual assertions, querying gazettes & fact repositories, and evaluating evidence stances.
        </p>

        {/* 4 Pipeline Steps */}
        <div className="steps-list">
          {ANALYSIS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isPending = idx > currentStepIndex;

            let rowClass = 'step-row pending';
            if (isCompleted) rowClass = 'step-row completed';
            else if (isActive) rowClass = 'step-row active';

            return (
              <div key={step.id} className={rowClass}>
                <div className="step-indicator">
                  {getStepIcon(idx, isActive, isCompleted)}
                </div>
                <div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.description}</div>
                </div>
                {isActive && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    Processing...
                  </span>
                )}
                {isCompleted && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--verdict-supported)', fontWeight: 600 }}>
                    Verified
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Simulation Mode • Applying strict contract rules (`contracts/verdict.schema.json`)
        </div>
      </div>
    </div>
  );
}
