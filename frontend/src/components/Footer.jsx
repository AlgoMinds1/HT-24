import React from 'react';
import { Github, ExternalLink } from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

export default function Footer() {
  const { setScreen } = useVerification();

  const scrollToLandingSection = (id) => {
    setScreen('landing');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <footer className="editorial-footer">
      <div className="container-editorial">
        <div className="footer-grid">
          {/* Brand Block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <svg style={{ width: '24px', height: '24px', color: 'var(--color-forest)' }} viewBox="0 0 32 32" fill="none">
                <path d="M16 4C9.5 4 4 9.5 4 16C4 22.5 9.5 28 16 28C22.5 28 28 22.5 28 16C28 9.5 22.5 4 16 4Z" stroke="var(--color-forest)" strokeWidth="2" />
                <path d="M10 20C11.5 14 16 10 22 10C20.5 16 16 20 10 20Z" fill="var(--color-sage-light)" stroke="var(--color-forest)" strokeWidth="1.5" />
              </svg>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--color-ink)' }}>TruthLens</span>
            </div>
            <p className="footer-brand-summary">
              An evidence-grounded claim verification platform. We analyze viral forwards, 
              surface authoritative primary sources, and expose real-world risk.
            </p>
          </div>

          {/* Links */}
          <ul className="footer-links-row">
            <li>
              <button 
                type="button" 
                onClick={() => scrollToLandingSection('how-it-works')}
                style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)' }}
              >
                How It Works
              </button>
            </li>
            <li>
              <button 
                type="button" 
                onClick={() => scrollToLandingSection('capabilities')}
                style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)' }}
              >
                Capabilities
              </button>
            </li>
            <li>
              <button 
                type="button" 
                onClick={() => scrollToLandingSection('trust-principles')}
                style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)' }}
              >
                Trust Principles
              </button>
            </li>
            <li>
              <button 
                type="button" 
                onClick={() => setScreen('dashboard')}
                style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)' }}
              >
                Verification Studio
              </button>
            </li>
            <li>
              <a 
                href="https://github.com/AlgoMinds1/HT-24" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.875rem', color: 'var(--color-forest)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Github size={14} /> Repository
              </a>
            </li>
          </ul>
        </div>

        {/* Bottom Line */}
        <div className="footer-bottom-line">
          <span>TruthLens — Is This Forward True? · Built for Hackathon 2024</span>
          <span>Zero Telemetry · Evidence Precedes Generation</span>
        </div>
      </div>
    </footer>
  );
}
