import React from 'react';
import { ShieldCheck, LayoutDashboard, Home } from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

export default function Header() {
  const { isMockMode, screen, goToDashboard, goToLanding } = useVerification();

  return (
    <header className="app-header">
      <div className="logo-group" onClick={goToLanding} style={{ cursor: 'pointer' }}>
        <div className="logo-icon-wrapper">
          <ShieldCheck size={26} color="#FAF7F2" strokeWidth={2.4} />
        </div>
        <div>
          <span className="logo-title">TruthLens</span>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Viral Forward & Claim Verification
          </p>
        </div>
      </div>

      <div className="header-badges">
        {/* Screen Switcher */}
        {screen === 'landing' ? (
          <button 
            className="btn-primary" 
            onClick={goToDashboard}
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}
          >
            <LayoutDashboard size={15} />
            <span>Open Dashboard</span>
          </button>
        ) : (
          <button 
            className="btn-secondary" 
            onClick={goToLanding}
            style={{ padding: '0.45rem 1rem', fontSize: '0.84rem' }}
          >
            <Home size={15} />
            <span>Landing Page</span>
          </button>
        )}

        {isMockMode && (
          <div className="mock-indicator" title="Using local contract fixtures for verification without calling live backend APIs">
            <span className="mock-dot"></span>
            <span>Fixture Mode</span>
          </div>
        )}
      </div>
    </header>
  );
}
