import React, { useState } from 'react';
import { 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Shield,
  Search,
  BookOpen
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function SignUpScreen() {
  const { setScreen, signup } = useVerification();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to TruthLens Verification Guidelines.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      signup(name, email, password);
      setIsLoading(false);
    }, 400);
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
              A clearer way<br />
              to check what<br />
              you share.
            </h2>
            <p className="auth-panel-desc">
              Create your account to access your verification workspace and preserve claim audits.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-ink-secondary)' }}>
              <Shield size={16} color="var(--color-forest)" />
              <span>Independent verification guidelines</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-ink-secondary)' }}>
              <Search size={16} color="var(--color-forest)" />
              <span>Grounded primary source cross-checks</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-ink-secondary)' }}>
              <BookOpen size={16} color="var(--color-forest)" />
              <span>Transparent audit history retention</span>
            </div>
          </div>
        </div>

        {/* Right Side: Sign-Up Form */}
        <div className="auth-form-panel">
          <span className="section-eyebrow" style={{ marginBottom: '0.35rem' }}>ANALYST ACCESS</span>
          <h1 className="auth-form-title">Create Account</h1>
          <p className="auth-form-subtitle">Join reviewers examining viral forwards with evidence.</p>

          {error && (
            <div style={{ padding: '0.75rem', background: 'var(--color-verdict-false-bg)', color: 'var(--color-verdict-false)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group-editorial">
              <label className="form-label-editorial" htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                className="form-input-editorial"
                placeholder="Nidhi Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group-editorial">
              <label className="form-label-editorial" htmlFor="signup-email">Work / Personal Email</label>
              <input
                id="signup-email"
                type="email"
                className="form-input-editorial"
                placeholder="reviewer@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group-editorial">
              <label className="form-label-editorial" htmlFor="signup-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input-editorial"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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

            <div className="form-group-editorial">
              <label className="form-label-editorial" htmlFor="signup-confirm-password">Confirm Password</label>
              <input
                id="signup-confirm-password"
                type="password"
                className="form-input-editorial"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-ink-secondary)' }}>
              <input
                type="checkbox"
                id="signup-terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ accentColor: 'var(--color-forest)', marginTop: '2px' }}
                required
              />
              <label htmlFor="signup-terms">
                I agree to the TruthLens Ethical Verification Charter and understand that automated outputs must be cross-referenced with primary citations.
              </label>
            </div>

            <button
              type="submit"
              className="btn-forest"
              disabled={isLoading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9375rem' }}
            >
              {isLoading ? 'Creating Account...' : 'Register Reviewer Account'}
            </button>
          </form>

          <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setScreen('signin')}
              style={{ color: 'var(--color-forest)', fontWeight: 600 }}
            >
              Sign in
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
