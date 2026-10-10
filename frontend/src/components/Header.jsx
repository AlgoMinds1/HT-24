import React from 'react';
import { ShieldCheck, RotateCcw, Home, LayoutDashboard } from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

/**
 * Compact Sticky Header
 * Features logo, subtitle, primary 'Verify Another Forward' action, and secondary 'Home' link.
 */
export default function Header() {
  const { isMockMode, screen, goToDashboard, goToLanding, resetVerification } = useVerification();

  return (
    <header className="app-header compact-sticky-header">
      <div className="header-brand-wrap" onClick={goToLanding} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') goToLanding(); }}>
        <div className="logo-icon-wrapper compact">
          <ShieldCheck size={22} color="#FAF7F2" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <div className="brand-text-column">
          <div className="brand-title-row">
            <span className="logo-title">TruthLens</span>
            {isMockMode && (
              <span className="compact-mock-tag" title="Local fixture contract mode active">
                Demo Fixtures
              </span>
            )}
          </div>
          <span className="logo-subtitle">Viral Forward & Claim Verification</span>
        </div>
      </div>

      <nav className="header-actions-group" aria-label="Main Navigation">
        {/* Secondary Home Navigation */}
        <button 
          type="button" 
          className="header-link-btn" 
          onClick={goToLanding}
          aria-label="Navigate to Home"
        >
          <Home size={15} aria-hidden="true" />
          <span>Home</span>
        </button>

        {/* Primary Action Button */}
        {screen === 'landing' ? (
          <button 
            type="button" 
            className="btn-primary compact-header-btn" 
            onClick={goToDashboard}
          >
            <LayoutDashboard size={15} aria-hidden="true" />
            <span>Open Dashboard</span>
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-primary compact-header-btn" 
            onClick={resetVerification}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Verify Another Forward</span>
          </button>
        )}
      </nav>
    </header>
  );
}
