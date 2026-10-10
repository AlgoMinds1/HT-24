import React, { useState, useEffect } from 'react';
import { 
  User, 
  Server, 
  ShieldCheck, 
  Database, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Activity
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { API_BASE_URL } from '../../services/verificationService';

export default function SettingsScreen() {
  const { 
    user, 
    logout, 
    isMockMode, 
    historyList = [], 
    clearHistory 
  } = useVerification();

  const [backendHealth, setBackendHealth] = useState({ status: 'checking', details: null });

  useEffect(() => {
    fetch(`${API_BASE_URL.replace('/api', '')}/api/health`)
      .then(res => res.json())
      .then(data => {
        setBackendHealth({ status: 'online', details: data });
      })
      .catch(err => {
        setBackendHealth({ status: 'offline', details: err.message });
      });
  }, []);

  return (
    <div className="container-editorial" style={{ padding: '3.5rem 1.5rem', maxWidth: '960px' }}>
      
      {/* Editorial Header */}
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
        <span className="section-eyebrow">SYSTEM & SESSION</span>
        <h1 className="section-title-serif" style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>
          Diagnostics & Preferences
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-secondary)' }}>
          Inspect active verification models, live backend endpoints, and session data.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Session Card */}
        <div className="settings-card-editorial">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <User size={18} color="var(--color-forest)" />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-ink)', fontWeight: 600 }}>Active Reviewer Session</h3>
            </div>
            <span 
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '10px',
                background: user?.isGuest ? 'var(--color-paper)' : 'var(--color-sage-light)',
                color: 'var(--color-forest-dark)',
                fontWeight: 600,
                border: '1px solid var(--color-border)'
              }}
            >
              {user?.isGuest ? 'Guest Reviewer' : 'Authenticated Analyst'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: '2px' }}>DISPLAY NAME</div>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{user?.name || 'Guest Reviewer'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginBottom: '2px' }}>EMAIL IDENTIFIER</div>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{user?.email || 'reviewer@truthlens.ai'}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary-quiet"
            onClick={logout}
            style={{ fontSize: '0.8125rem', color: 'var(--color-verdict-false)', borderColor: 'rgba(169, 68, 56, 0.3)' }}
          >
            <LogOut size={13} /> End Current Session
          </button>
        </div>

        {/* Backend Health Diagnostics */}
        <div className="settings-card-editorial">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Server size={18} color="var(--color-forest)" />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-ink)', fontWeight: 600 }}>Backend Service Diagnostics</h3>
            </div>
            <span 
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
                background: backendHealth.status === 'online' ? 'var(--color-verdict-success-bg)' : 'var(--color-verdict-warning-bg)',
                color: backendHealth.status === 'online' ? 'var(--color-verdict-success)' : 'var(--color-verdict-warning)'
              }}
            >
              {backendHealth.status === 'online' ? '● API Online' : backendHealth.status === 'checking' ? 'Checking...' : 'Offline'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.85rem', background: 'var(--color-paper-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>ENDPOINT</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                http://localhost:8000
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--color-paper-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>SERVICE STATE</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px', color: 'var(--color-forest)' }}>
                {backendHealth.details?.status || 'Active'}
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--color-paper-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>GEMINI ENGINE</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                {backendHealth.details?.geminiConfigured ? 'Connected' : 'Fixture Fallback'}
              </div>
            </div>
          </div>
        </div>

        {/* Architecture & Disclosures */}
        <div className="settings-card-editorial">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <ShieldCheck size={18} color="var(--color-forest)" />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-ink)', fontWeight: 600 }}>Architecture & Integrity Charter</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-ink-secondary)', lineHeight: 1.55 }}>
            <p>
              <strong>Zero-Telemetry Policy:</strong> Claim texts, image OCR buffers, and audio transcripts are processed ephemerally. TruthLens does not store uploaded user media on public databases or retain text for generative model training.
            </p>
            <p>
              <strong>Dual Mode Configuration:</strong> TruthLens is configured to operate in both <em>Live Engine Mode</em> (`VITE_USE_MOCK=false`) and <em>Benchmark Fixture Mode</em> (`VITE_USE_MOCK=true`).
            </p>
            <p>
              <strong>Strict Schema Contracts:</strong> Every verdict payload conforms strictly to <code>contracts/verdict.schema.json</code> and validates against Ajv prior to user display.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
