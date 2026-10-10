import React from 'react';
import { 
  ArrowRight, 
  Play, 
  FileText, 
  Search, 
  GitBranch, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  Building2,
  Newspaper,
  XCircle,
  HelpCircle,
  Eye,
  CornerDownRight
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function LandingPage() {
  const { setScreen, selectPreset } = useVerification();

  const handleLaunchStudio = () => {
    setScreen('dashboard');
  };

  const handleInspectSampleKyc = () => {
    selectPreset('suspicious_kyc');
    setScreen('result');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page-root">
      {/* ====================================================================
          HERO SECTION (Faithfully matching the Editorial Reference Image)
          ==================================================================== */}
      <section className="hero-editorial-section">
        <div className="container-hero">
          <div className="hero-editorial-grid">
            
            {/* Left Column: Editorial Headline & Actions */}
            <div className="hero-text-col">
              <span className="hero-eyebrow">A MORE INFORMED INTERNET</span>
              
              <h1 className="hero-headline">
                Before you<br />
                forward it,<br />
                <em>verify it.</em>
              </h1>

              <p className="hero-paragraph">
                Check suspicious messages, screenshots, voice notes, documents and links. 
                Understand the claim, examine the evidence, and make more informed decisions before sharing.
              </p>

              <div className="hero-cta-group">
                <button 
                  type="button" 
                  className="btn-forest" 
                  onClick={handleLaunchStudio}
                  style={{ padding: '0.8rem 1.6rem', fontSize: '0.95rem' }}
                >
                  Verify a Message <ArrowRight size={16} />
                </button>

                <button 
                  type="button" 
                  className="btn-secondary-quiet"
                  onClick={() => scrollToSection('how-it-works')}
                  style={{ padding: '0.75rem 1.4rem', fontSize: '0.95rem', gap: '0.6rem' }}
                >
                  <Play size={15} fill="currentColor" strokeWidth={0} /> See How It Works
                </button>
              </div>
            </div>

            {/* Right Column: Hero Page Image covering the right side */}
            <div 
              className="hero-image-col" 
              onClick={handleInspectSampleKyc}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleInspectSampleKyc()}
              title="Click to inspect this sample verification report"
              aria-label="Sample verification dossier showing suspicious WhatsApp message and verified phishing verdict"
            >
              <img 
                src="/assets/hero-visual.png" 
                alt="TruthLens Verification Dossier: Suspicious WhatsApp Forward and Grounded Fact-Check"
                className="hero-artwork-img"
              />
            </div>

          </div>
        </div>
      </section>



      {/* ====================================================================
          THREE-STEP PROCESS SECTION
          ==================================================================== */}
      <section id="how-it-works" className="process-editorial-section">
        <div className="container-editorial">
          <span className="section-eyebrow">SIMPLE STEPS, CLEAR ANSWERS</span>
          <h2 className="section-title-serif">How TruthLens Works</h2>

          <div className="process-three-grid">
            <div className="process-card">
              <span className="process-number">01</span>
              <h3 className="process-heading">Submit</h3>
              <p className="process-desc">
                Paste a message, upload an image, audio clip, document or link. 
                We extract the key claim without losing contextual nuance.
              </p>
            </div>

            <div className="process-card">
              <span className="process-number">02</span>
              <h3 className="process-heading">Analyse</h3>
              <p className="process-desc">
                We cross-examine the claim against authoritative primary sources, 
                detect contradictions, and test temporal validity over time.
              </p>
            </div>

            <div className="process-card">
              <span className="process-number">03</span>
              <h3 className="process-heading">Understand</h3>
              <p className="process-desc">
                Receive an explainable verdict backed by direct source quotes, 
                stress-test findings, and non-alarmist safety guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          CAPABILITIES SECTION
          ==================================================================== */}
      <section id="capabilities" className="capabilities-section">
        <div className="container-editorial">
          <span className="section-eyebrow">FORENSIC ARCHITECTURE</span>
          <h2 className="section-title-serif">Engineered for Verifiable Intelligence</h2>

          <div className="capabilities-grid-editorial">
            <div className="capability-card">
              <div className="capability-icon-wrap"><FileText size={18} /></div>
              <h4 className="capability-title">Multimodal Ingestion</h4>
              <p className="capability-desc">
                Normalizes text forwards, screenshot OCR, voice note audio transcription, 
                and PDF circulars into standardized claim contracts.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon-wrap"><Search size={18} /></div>
              <h4 className="capability-title">Evidence-Grounded RAG</h4>
              <p className="capability-desc">
                Distinguishes retrieved institutional facts from model-generated text. 
                Every citation retains publisher, URL, and stance attribution.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon-wrap"><GitBranch size={18} /></div>
              <h4 className="capability-title">Contradiction Detection</h4>
              <p className="capability-desc">
                Runs parallel adversarial verification queries. Divergent or conflicting 
                findings are transparently highlighted rather than suppressed.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon-wrap"><Clock size={18} /></div>
              <h4 className="capability-title">Truth-at-Time Engine</h4>
              <p className="capability-desc">
                Factual status changes over time. Distinguishes active advisories from 
                expired 2020 subsidies and outdated government notices.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon-wrap"><ShieldAlert size={18} /></div>
              <h4 className="capability-title">Action-Risk Scoring</h4>
              <p className="capability-desc">
                Evaluates real-world danger: financial smishing, critical health delays, 
                or identity theft. Delivers calm, actionable defensive steps.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon-wrap"><Eye size={18} /></div>
              <h4 className="capability-title">Zero-Telemetry Privacy</h4>
              <p className="capability-desc">
                Submitted messages are analyzed ephemeral without being stored into 
                central training datasets or commercial telemetry brokers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          TRUST PRINCIPLES SECTION
          ==================================================================== */}
      <section id="trust-principles" className="trust-principles-section">
        <div className="container-editorial">
          <span className="section-eyebrow">OUR EDITORIAL CHARTER</span>
          <h2 className="section-title-serif" style={{ marginBottom: '2rem' }}>Principles of Verification Integrity</h2>

          <div className="trust-grid">
            <div className="trust-item">
              <h4>Evidence Precedes Generative Output</h4>
              <p>
                We never fabricate consensus. If external databases lack verifiable evidence, 
                we explicitly return an unconfirmed status rather than hallucinating answers.
              </p>
            </div>

            <div className="trust-item">
              <h4>Contradictions Remain Visible</h4>
              <p>
                When independent verification paths disagree, TruthLens alerts the reader to the 
                divergence instead of averaging out the disagreement.
              </p>
            </div>

            <div className="trust-item">
              <h4>Temporal Decay Matters</h4>
              <p>
                A claim that was true three years ago may be invalid today. Our timeline highlights 
                original announcements alongside subsequent cancellation notices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          FINAL CALL TO ACTION
          ==================================================================== */}
      <section id="about" style={{ padding: '5.5rem 0', textAlign: 'center', background: 'var(--color-paper)' }}>
        <div className="container-editorial" style={{ maxWidth: '640px' }}>
          <span className="section-eyebrow">START EXAMINING CLAIMS</span>
          <h2 className="section-title-serif" style={{ fontSize: '2.75rem', marginBottom: '1.25rem' }}>
            Make room for the facts.
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--color-ink-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Paste a forward, drop a screenshot, or share a voice note. Inspect the primary evidence before passing it on to your family or group chats.
          </p>
          <button 
            type="button" 
            className="btn-forest" 
            onClick={handleLaunchStudio}
            style={{ padding: '0.85rem 1.8rem', fontSize: '1rem' }}
          >
            Verify a Forward Now <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
