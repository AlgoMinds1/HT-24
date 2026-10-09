import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Search, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  ArrowDown, 
  Sparkles,
  Lock,
  EyeOff
} from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

export default function LandingHero({ onScrollToVerifier }) {
  const { selectPreset } = useVerification();

  const handleQuickSample = (key) => {
    selectPreset(key);
    if (onScrollToVerifier) {
      onScrollToVerifier();
    }
  };

  return (
    <div className="landing-hero-container">
      {/* Top Banner Tag */}
      <div className="landing-pill">
        <Sparkles size={15} color="var(--accent-terracotta)" />
        <span>Open Intelligence • No Login or Account Required</span>
      </div>

      {/* Main Headline */}
      <h1 className="landing-main-title">
        Is That Viral Forward <span className="highlight-text">Actually True?</span>
      </h1>

      {/* Subtitle */}
      <p className="landing-main-subtitle">
        Instant automated fact-checking for WhatsApp messages, government scheme announcements,
        viral health remedies, and suspicious bank KYC advisories.
      </p>

      {/* CTAs */}
      <div className="landing-cta-group">
        <button className="btn-primary" onClick={onScrollToVerifier}>
          <span>Verify Forward Now</span>
          <ArrowDown size={18} />
        </button>

        <button 
          className="btn-secondary"
          onClick={() => handleQuickSample('suspicious_kyc')}
        >
          <Zap size={16} color="var(--accent-terracotta)" />
          <span>Try Sample KYC Scam</span>
        </button>
      </div>

      {/* Trust & Feature Highlights Grid */}
      <div className="landing-features-grid">
        <div className="landing-feature-card">
          <div className="feature-icon-wrapper">
            <Search size={22} color="var(--accent-terracotta)" />
          </div>
          <h3>Multi-Modal Ingestion</h3>
          <p>Analyze plain text forwards, screenshots, voice notes, PDF circulars, and web links.</p>
        </div>

        <div className="landing-feature-card">
          <div className="feature-icon-wrapper">
            <AlertTriangle size={22} color="var(--verdict-outdated)" />
          </div>
          <h3>Action Risk Scoring</h3>
          <p>Identifies smishing, financial fraud links, and dangerous unverified medical claims.</p>
        </div>

        <div className="landing-feature-card">
          <div className="feature-icon-wrapper">
            <ShieldCheck size={22} color="var(--verdict-supported)" />
          </div>
          <h3>Authoritative Evidence</h3>
          <p>Cross-references official gazettes, PIB fact checks, and verified registries with stance pills.</p>
        </div>

        <div className="landing-feature-card">
          <div className="feature-icon-wrapper">
            <EyeOff size={22} color="var(--accent-terracotta)" />
          </div>
          <h3>Frictionless & Private</h3>
          <p>Zero login, no phone number, and no tracking. Get transparent debunks instantly.</p>
        </div>
      </div>
    </div>
  );
}
