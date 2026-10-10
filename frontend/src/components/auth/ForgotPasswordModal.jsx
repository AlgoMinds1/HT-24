import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function ForgotPasswordModal() {
  const { setScreen } = useVerification();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="auth-page-container">
      <div 
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-paper)', border: '1px solid var(--color-border)', color: 'var(--color-forest)', marginBottom: '1rem' }}>
            <Mail size={22} />
          </div>
          <h1 className="auth-form-title" style={{ fontSize: '1.65rem' }}>Password Recovery</h1>
          <p className="auth-form-subtitle" style={{ marginBottom: 0 }}>
            Enter your email to receive recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ display: 'inline-flex', padding: '0.65rem', borderRadius: '50%', background: 'var(--color-verdict-success-bg)', color: 'var(--color-verdict-success)', marginBottom: '1rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-ink)', marginBottom: '0.5rem' }}>Recovery Email Dispatched</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              If an analyst workstation is registered with <strong>{email}</strong>, a reset token has been simulated.
            </p>
            <button
              type="button"
              className="btn-forest"
              onClick={() => setScreen('signin')}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              <ArrowLeft size={15} /> Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--color-verdict-false-bg)', color: 'var(--color-verdict-false)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="form-group-editorial">
              <label className="form-label-editorial" htmlFor="recovery-email">Registered Email Address</label>
              <input
                id="recovery-email"
                type="email"
                className="form-input-editorial"
                placeholder="analyst@truthlens.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-forest"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem' }}
            >
              Send Reset Instructions
            </button>

            <button
              type="button"
              className="btn-secondary-quiet"
              onClick={() => setScreen('signin')}
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', marginTop: '0.75rem' }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
