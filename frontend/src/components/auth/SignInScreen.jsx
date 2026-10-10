import React, { useState } from 'react';
import { 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  AlertCircle,
  FileCheck2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function SignInScreen() {
  const { setScreen, login } = useVerification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login(email, password);
      setIsLoading(false);
    }, 400);
  };

  const handleGuestEntry = () => {
    login('reviewer@truthlens.ai', 'demo123');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-split-card">
        
        {/* Left Side: Brand Panel */}
        <div className="auth-brand-panel">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <svg style={{ width: '28px', height: '28px', color: 'var(--color-forest)' }} viewBox="0 0 32 32" fill="none">
                <path d="M16 4C9.5 4 4 9.5 4 16C4 22.5 9.5 28 16 28C22.5 28 28 22.5 28 16C28 9.5 22.5 4 16 4Z" stroke="var(--color-forest)" strokeWidth="2" />
                <path d="M10 20C11.5 14 16 10 22 10C20.5 16 16 20 10 20Z" fill="var(--color-sage-light)" stroke="var(--color-forest)" strokeWidth="1.5" />
              </svg>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-ink)' }}>TruthLens</span>
            </div>

            <h2 className="auth-panel-title">
              Make room<br />
              for the facts.
            </h2>
            <p className="auth-panel-desc">
              Return to your verification workspace and examine the primary information behind the claim.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-ink-secondary)' }}>
              <FileCheck2 size={16} color="var(--color-forest)" />
              <span>Evidence-grounded source retrieval</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-ink-secondary)' }}>
              <Clock size={16} color="var(--color-forest)" />
              <span>Temporal validity & Truth-at-Time</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-ink-secondary)' }}>
              <ShieldCheck size={16} color="var(--color-forest)" />
              <span>Real-world action risk warnings</span>
            </div>
          </div>
        </div>

        {/* Right Side: Sign-In Form */}
        <div className="auth-form-panel">
          <span className="section-eyebrow" style={{ marginBottom: '0.35rem' }}>WELCOME BACK</span>
          <h1 className="auth-form-title">Sign in to TruthLens</h1>
          <p className="auth-form-subtitle">Continue examining claims with clarity.</p>

          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--color-verdict-false-bg)', color: 'var(--color-verdict-false)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group-editorial">
              <label className="form-label-editorial" htmlFor="signin-email">Email Address</label>
              <input
                id="signin-email"
                type="email"
                className="form-input-editorial"
                placeholder="analyst@truthlens.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group-editorial">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label-editorial" htmlFor="signin-password" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setScreen('forgot_password')}
                  style={{ fontSize: '0.75rem', color: 'var(--color-forest)' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input-editorial"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-ink-secondary)' }}>
              <input
                type="checkbox"
                id="signin-remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-forest)' }}
              />
              <label htmlFor="signin-remember">Remember this reviewer workstation</label>
            </div>

            <button
              type="submit"
              className="btn-forest"
              disabled={isLoading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9375rem' }}
            >
              {isLoading ? 'Signing In...' : 'Sign In to Workspace'}
            </button>
          </form>

          {/* Guest Access Divider */}
          <div className="auth-guest-divider">
            <span>or instant review</span>
          </div>

          <button
            type="button"
            className="btn-secondary-quiet"
            onClick={handleGuestEntry}
            style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}
          >
            Continue as Guest Reviewer <ArrowRight size={14} />
          </button>

          <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
            Need an analyst account?{' '}
            <button
              type="button"
              onClick={() => setScreen('signup')}
              style={{ color: 'var(--color-forest)', fontWeight: 600 }}
            >
              Create account
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
