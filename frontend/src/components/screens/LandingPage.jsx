import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Search, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  EyeOff, 
  Cpu, 
  Clock, 
  Scale, 
  ChevronRight,
  ShieldAlert,
  Play
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { FIXTURE_MAP } from '../../services/verificationService';

export default function LandingPage() {
  const { goToDashboard, selectPreset } = useVerification();
  const [selectedDemoKey, setSelectedDemoKey] = useState('suspicious_kyc');

  const demoData = FIXTURE_MAP[selectedDemoKey].data;

  return (
    <div className="landing-page-root">
      {/* 1. Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-pill">
          <Sparkles size={16} color="var(--accent-terracotta)" />
          <span>Open Intelligence Engine • Zero Login & No Tracking</span>
        </div>

        <h1 className="landing-main-title">
          Is That Viral Forward <br />
          <span className="highlight-text">Actually True?</span>
        </h1>

        <p className="landing-main-subtitle">
          TruthLens is an automated fact-checking and debunking intelligence system designed to verify
          viral forwards, suspicious claims, government scheme announcements, health advisories, and financial KYC scams.
        </p>

        <div className="landing-cta-group">
          <button className="btn-primary" onClick={goToDashboard} style={{ fontSize: '1.1rem', padding: '1rem 2.5rem' }}>
            <span>Enter Verification Dashboard</span>
            <ArrowRight size={20} />
          </button>

          <button 
            className="btn-secondary"
            onClick={() => selectPreset('false_health', true)}
          >
            <Play size={16} color="var(--accent-terracotta)" />
            <span>Run 1-Click Health Demo</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="trust-pills-row">
          <span className="trust-pill"><CheckCircle2 size={14} color="var(--verdict-supported)" /> 100% Free & Open Access</span>
          <span className="trust-pill"><CheckCircle2 size={14} color="var(--verdict-supported)" /> No Sign-Up or Password</span>
          <span className="trust-pill"><CheckCircle2 size={14} color="var(--verdict-supported)" /> JSON Schema Contract Compliant</span>
        </div>
      </section>

      {/* 2. Interactive Live Demo Card Preview */}
      <section className="demo-preview-section">
        <div className="section-header-centered">
          <span className="sub-heading-pill">Interactive Preview</span>
          <h2>Explore Live Contract Verdicts</h2>
          <p>Click any claim below to see how TruthLens extracts claims, scores evidence, and flags scam risks.</p>
        </div>

        {/* Demo Selector Tabs */}
        <div className="demo-selector-bar">
          {Object.entries(FIXTURE_MAP).map(([key, item]) => (
            <button
              key={key}
              className={`demo-selector-btn ${selectedDemoKey === key ? 'active' : ''}`}
              onClick={() => setSelectedDemoKey(key)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Interactive Sample Card */}
        <div className="glass-card demo-interactive-card">
          <div className="demo-card-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className={`preset-badge ${selectedDemoKey === 'outdated_gov' ? 'outdated' : selectedDemoKey === 'false_health' ? 'false' : 'kyc'}`}>
                {demoData.verdict}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Confidence: <strong>{(demoData.confidence.score * 100).toFixed(0)}% ({demoData.confidence.rating})</strong>
              </span>
            </div>

            <button 
              className="feedback-btn" 
              onClick={() => selectPreset(selectedDemoKey, true)}
              style={{ background: 'var(--accent-terracotta)', color: '#FFF', border: 'none', padding: '0.5rem 1rem' }}
            >
              <span>Verify in Full Dashboard</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ margin: '1.25rem 0' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-terracotta)', fontWeight: 700, textTransform: 'uppercase' }}>
              Original Incoming Message:
            </span>
            <p style={{ fontStyle: 'italic', color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.96rem', lineHeight: 1.5 }}>
              "{demoData.input.raw_text}"
            </p>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <BookOpen size={16} color="var(--accent-terracotta)" />
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Debunking Summary:</strong>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {demoData.plain_explanation}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="var(--verdict-false)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {demoData.action_risk.risk_category.replace('_', ' ')} • {demoData.action_risk.risk_level} Risk
              </span>
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {demoData.evidence.length} Authoritative Sources Cited
            </span>
          </div>
        </div>
      </section>

      {/* 3. Four-Step Verification Pipeline */}
      <section className="landing-pipeline-section">
        <div className="section-header-centered">
          <span className="sub-heading-pill">Multi-Agent Intelligence</span>
          <h2>How TruthLens Verifies Viral Claims</h2>
          <p>Strict multi-step synthesis to prevent hallucinations and evaluate real user harm.</p>
        </div>

        <div className="pipeline-grid">
          <div className="pipeline-step-card">
            <div className="pipeline-number">01</div>
            <h3>Claim Extraction</h3>
            <p>Isolates atomic factual assertions from noisy chat forwards, images, or audio voice notes.</p>
          </div>

          <div className="pipeline-step-card">
            <div className="pipeline-number">02</div>
            <h3>Evidence Retrieval</h3>
            <p>Queries gazettes, official PIB fact checks, medical journals, and regulatory announcements.</p>
          </div>

          <div className="pipeline-step-card">
            <div className="pipeline-number">03</div>
            <h3>Adversarial Check</h3>
            <p>Stress-tests claims against counter-arguments, regional scheme nuances, and expiration dates.</p>
          </div>

          <div className="pipeline-step-card">
            <div className="pipeline-number">04</div>
            <h3>Action Risk Scoring</h3>
            <p>Assigns strict verdicts (`OUTDATED`, `FALSE`, etc.) and advises immediate safety steps.</p>
          </div>
        </div>
      </section>

      {/* 4. Bottom Launch CTA */}
      <section className="landing-bottom-cta">
        <div className="glass-card bottom-cta-card">
          <h2>Ready to test a forward or claim?</h2>
          <p>
            Paste any text forward, upload a screenshot, attach an audio recording, or test a link directly in the studio.
          </p>
          <button className="btn-primary" onClick={goToDashboard} style={{ fontSize: '1.05rem', padding: '0.95rem 2.25rem' }}>
            <span>Open Verification Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

function BookOpen(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  );
}
