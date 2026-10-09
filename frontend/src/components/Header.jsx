import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

export default function Header() {
  const { isMockMode, resetVerification } = useVerification();

  return (
    <header className="app-header">
      <div className="logo-group" onClick={resetVerification} style={{ cursor: 'pointer' }}>
        <div className="logo-icon-wrapper">
          <ShieldCheck size={26} color="#ffffff" strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="logo-title">TruthLens</span>
            <span className="logo-badge">PS3 Intelligence</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Viral Forward & Claim Verification Engine
          </p>
        </div>
      </div>

      <div className="header-badges">
        {isMockMode && (
          <div className="mock-indicator" title="Using local contract fixtures for verification without calling live backend APIs">
            <span className="mock-dot"></span>
            <span>USE_MOCK = true (Fixture Mode)</span>
          </div>
        )}
      </div>
    </header>
  );
}
