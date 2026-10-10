import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  ArrowRight, 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  FileCheck, 
  Globe, 
  Clock, 
  RotateCcw
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';

export default function HistoryScreen() {
  const { 
    historyList = [], 
    openPastReport, 
    deleteHistoryItem, 
    clearHistory, 
    setScreen 
  } = useVerification();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerdictFilter, setSelectedVerdictFilter] = useState('ALL');
  const [selectedModalityFilter, setSelectedModalityFilter] = useState('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const getModalityIcon = (mod) => {
    switch (mod) {
      case 'image': return <ImageIcon size={14} />;
      case 'audio': return <Mic size={14} />;
      case 'pdf': return <FileCheck size={14} />;
      case 'url': return <Globe size={14} />;
      case 'text':
      default: return <FileText size={14} />;
    }
  };

  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesClaim = (item.claim || '').toLowerCase().includes(query);
        const matchesSummary = (item.summary || '').toLowerCase().includes(query);
        if (!matchesClaim && !matchesSummary) return false;
      }

      if (selectedVerdictFilter !== 'ALL') {
        if ((item.verdictStatus || '').toUpperCase() !== selectedVerdictFilter) return false;
      }

      if (selectedModalityFilter !== 'ALL') {
        if (item.modality !== selectedModalityFilter) return false;
      }

      return true;
    });
  }, [historyList, searchQuery, selectedVerdictFilter, selectedModalityFilter]);

  return (
    <div className="container-editorial" style={{ padding: '3.5rem 1.5rem' }}>
      
      {/* Editorial Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
        <div>
          <span className="section-eyebrow">AUDIT RECORD</span>
          <h1 className="section-title-serif" style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>
            Verification History
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-secondary)' }}>
            Examine, search, and reopen forensic claim reports generated during your review sessions.
          </p>
        </div>

        {historyList.length > 0 && (
          <div>
            {!showClearConfirm ? (
              <button
                type="button"
                className="btn-secondary-quiet"
                onClick={() => setShowClearConfirm(true)}
                style={{ fontSize: '0.8rem', color: 'var(--color-verdict-false)', borderColor: 'rgba(169, 68, 56, 0.3)' }}
              >
                <Trash2 size={13} /> Clear History
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-forest"
                  onClick={() => {
                    clearHistory();
                    setShowClearConfirm(false);
                  }}
                  style={{ fontSize: '0.8rem', background: 'var(--color-verdict-false)' }}
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  className="btn-secondary-quiet"
                  onClick={() => setShowClearConfirm(false)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {historyList.length === 0 ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <Clock size={36} color="var(--color-ink-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-ink)', marginBottom: '0.5rem' }}>No verification reports recorded yet</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
            When you evaluate claims in the Verification Studio, your report findings will be automatically preserved here.
          </p>
          <button
            type="button"
            className="btn-forest"
            onClick={() => setScreen('dashboard')}
          >
            Launch Studio <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <>
          {/* Search & Filters */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
              <input
                type="text"
                className="form-input-editorial"
                placeholder="Search claims by keyword, entity, or medical remedy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-ink-muted)', fontWeight: 600 }}>Verdict:</span>
                {['ALL', 'FALSE', 'OUTDATED', 'SUPPORTED', 'CANNOT_CONFIRM'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVerdictFilter(v)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: selectedVerdictFilter === v ? 'var(--color-forest)' : 'var(--color-paper-light)',
                      color: selectedVerdictFilter === v ? '#FFFFFF' : 'var(--color-ink-secondary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {v === 'ALL' ? 'All' : v}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-ink-muted)', fontWeight: 600 }}>Modality:</span>
                {['ALL', 'text', 'image', 'audio', 'pdf', 'url'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedModalityFilter(m)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      background: selectedModalityFilter === m ? 'var(--color-forest)' : 'var(--color-paper-light)',
                      color: selectedModalityFilter === m ? '#FFFFFF' : 'var(--color-ink-secondary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {m === 'ALL' ? 'All' : m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards List */}
          {filteredHistory.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-ink-secondary)' }}>
              No past reports match the selected filters.
            </div>
          ) : (
            <div>
              {filteredHistory.map((item) => (
                <div key={item.id} className="history-card-editorial">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <span 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: item.verdictStatus === 'FALSE' ? 'var(--color-verdict-false-bg)' : item.verdictStatus === 'OUTDATED' ? 'var(--color-verdict-warning-bg)' : 'var(--color-verdict-success-bg)',
                          color: item.verdictStatus === 'FALSE' ? 'var(--color-verdict-false)' : item.verdictStatus === 'OUTDATED' ? 'var(--color-verdict-warning)' : 'var(--color-verdict-success)'
                        }}
                      >
                        {item.verdictStatus}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-ink-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        {getModalityIcon(item.modality)} {item.modality}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', marginLeft: 'auto' }}>
                        {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                      "{item.claim}"
                    </h4>
                    {item.summary && (
                      <p style={{ fontSize: '0.84rem', color: 'var(--color-ink-secondary)', lineHeight: 1.45 }}>
                        {item.summary}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '1.5rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn-forest"
                      onClick={() => openPastReport(item)}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8125rem' }}
                    >
                      Re-examine <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteHistoryItem(item.id)}
                      style={{ color: 'var(--color-ink-muted)', padding: '0.4rem' }}
                      title="Remove entry"
                      aria-label="Remove entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}
