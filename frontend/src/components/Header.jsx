import React, { useState } from 'react';
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  History, 
  Settings 
} from 'lucide-react';
import { useVerification } from '../context/VerificationContext';

export default function Header() {
  const { 
    screen, 
    setScreen, 
    user, 
    logout, 
    historyList = [] 
  } = useVerification();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navigate = (targetScreen) => {
    setScreen(targetScreen);
    setUserDropdownOpen(false);
  };

  return (
    <header className="editorial-header">
      <div className="container-editorial header-container">
        {/* Brand Logo & Descriptor */}
        <div 
          className="brand-block" 
          onClick={() => navigate('landing')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('landing')}
          aria-label="TruthLens Home"
          style={{ cursor: 'pointer' }}
        >
          {/* Elegant Botanical Lens Mark */}
          <svg className="brand-logo-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor">
            <path 
              d="M16 4C9.5 4 4 9.5 4 16C4 22.5 9.5 28 16 28C22.5 28 28 22.5 28 16C28 9.5 22.5 4 16 4Z" 
              stroke="var(--color-forest)" 
              strokeWidth="1.75" 
              strokeLinecap="round" 
            />
            <path 
              d="M10 20C11.5 14 16 10 22 10C20.5 16 16 20 10 20Z" 
              fill="var(--color-sage-light)" 
              stroke="var(--color-forest)" 
              strokeWidth="1.5" 
            />
            <path 
              d="M16 22C16 16 20 12 22 10" 
              stroke="var(--color-forest-dark)" 
              strokeWidth="1.25" 
              strokeLinecap="round" 
            />
          </svg>
          <div className="brand-text-col">
            <span className="brand-title">TruthLens</span>
            <span className="brand-descriptor">IS THIS FORWARD TRUE?</span>
          </div>
        </div>

        {/* Right Actions: Only Sign In (to Login) and Get Started (to Sign Up) */}
        <div className="header-actions">
          {user && !user.isGuest ? (
            /* Authenticated User Menu */
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn-secondary-quiet"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{ gap: '0.4rem', padding: '0.45rem 0.85rem' }}
              >
                <User size={15} />
                <span>{user.name.split(' ')[0]}</span>
              </button>

              {userDropdownOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '200px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 100,
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{user.name}</div>
                    <div style={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem' }}>{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('dashboard')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-ink)' }}
                  >
                    <LayoutDashboard size={14} /> Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('history')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-ink)' }}
                  >
                    <History size={14} /> Audit Trail ({historyList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('settings')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-ink)' }}
                  >
                    <Settings size={14} /> Diagnostics
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-verdict-false)', borderTop: '1px solid var(--color-border)' }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Public Actions: Sign In (Login page) & Get Started (Sign Up page) */
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button 
                type="button" 
                className="nav-link" 
                onClick={() => navigate('signin')}
                style={{ fontWeight: 500, fontSize: '0.9375rem' }}
              >
                Sign In
              </button>
              <button 
                type="button" 
                className="btn-forest"
                onClick={() => navigate('signup')}
                style={{ padding: '0.65rem 1.35rem', fontSize: '0.9rem' }}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
