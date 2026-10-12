import React, { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  FileCheck, 
  Link as LinkIcon, 
  ArrowRight, 
  UploadCloud, 
  X, 
  AlertCircle, 
  Play, 
  Pause, 
  History,
  Clock,
  Info,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { FIXTURE_MAP } from '../../services/verificationService';

export default function InputScreen() {
  const {
    activeTab,
    setActiveTab,
    textInput,
    setTextInput,
    selectedFile,
    setSelectedFile,
    urlInput,
    setUrlInput,
    activePresetKey,
    selectPreset,
    startVerification,
    isAnalyzing,
    historyList = [],
    openPastReport,
    setScreen,
    error,
    clearError,
    isMockMode,
    toggleMockMode
  } = useVerification();

  const [dragActive, setDragActive] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // URL Validation Helper
  const isValidUrl = (str) => {
    if (!str || !str.trim()) return false;
    try {
      const url = new URL(str.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isInputValid = () => {
    if (activeTab === 'text') {
      return textInput.trim().length >= 10;
    }
    if (activeTab === 'url') {
      return isValidUrl(urlInput);
    }
    if (activeTab === 'image' || activeTab === 'audio' || activeTab === 'pdf') {
      return selectedFile !== null;
    }
    return false;
  };

  // Drag and Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    if (activeTab === 'image' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviewUrl(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setIsPlayingAudio(false);
  };

  return (
    <div className="container-editorial" style={{ padding: '3.5rem 1.5rem' }}>
      
      {/* Studio Header */}
      <div className="studio-page-header">
        <span className="section-eyebrow">VERIFICATION STUDIO</span>
        <h1 className="section-title-serif" style={{ fontSize: '2.75rem', marginBottom: '0.65rem' }}>
          What would you like to verify?
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--color-ink-secondary)', maxWidth: '680px' }}>
          Bring a message, image, voice note, document or link. Start with the claim you want to understand.
        </p>
      </div>

      {/* Main Studio Card */}
      <div className="studio-main-card">
        {/* Verification Error Banner */}
        {error && (
          <div className="error-alert-banner" role="alert" style={{ marginBottom: '1.5rem' }}>
            <div className="error-alert-header">
              <div className="error-alert-title-wrap">
                <AlertTriangle size={18} className="error-alert-icon" />
                <span className="error-alert-title">
                  {error.code ? `Verification Notice [${error.code}]` : 'Verification Notice'}
                </span>
              </div>
              <button 
                type="button" 
                className="error-dismiss-btn" 
                onClick={clearError}
                aria-label="Dismiss error notice"
              >
                <X size={16} />
              </button>
            </div>
            
            <p className="error-alert-message">
              {typeof error === 'string' ? error : error.message}
            </p>
            
            {Array.isArray(error?.warnings) && error.warnings.length > 0 && (
              <ul className="error-alert-warnings">
                {error.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <div className="error-alert-actions" style={{ marginTop: '0.85rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-forest"
                style={{ fontSize: '0.8125rem', padding: '0.45rem 0.95rem' }}
                onClick={() => {
                  clearError();
                  startVerification();
                }}
              >
                <RotateCcw size={13} />
                <span>Retry Verification</span>
              </button>

              {!isMockMode && (
                <button
                  type="button"
                  className="btn-secondary-quiet"
                  style={{ fontSize: '0.8125rem', padding: '0.45rem 0.95rem', background: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }}
                  onClick={() => {
                    toggleMockMode();
                    clearError();
                    setTimeout(() => startVerification(), 50);
                  }}
                >
                  <Sparkles size={13} />
                  <span>Switch to Demo Fixtures Mode & Run</span>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Understated Modality Tabs */}
        <div className="tabs-navigation-strip" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`tab-btn-editorial ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            <FileText size={16} /> Text Forward
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'image'}
            className={`tab-btn-editorial ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <ImageIcon size={16} /> Image / Screenshot
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audio'}
            className={`tab-btn-editorial ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <Mic size={16} /> Voice Note / Audio
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pdf'}
            className={`tab-btn-editorial ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdf')}
          >
            <FileCheck size={16} /> PDF Circular
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'url'}
            className={`tab-btn-editorial ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <LinkIcon size={16} /> Web Link
          </button>
        </div>

        {/* Tab 1: Text Forward Input */}
        {activeTab === 'text' && (
          <div>
            <textarea
              className="textarea-editorial"
              placeholder="Paste the forwarded message here…"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              maxLength={5000}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', fontSize: '0.8125rem', color: 'var(--color-ink-muted)' }}>
              <span>{textInput.length} / 5,000 characters (min. 10)</span>
              {textInput.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setTextInput('')}
                  style={{ color: 'var(--color-forest)', fontSize: '0.8125rem', fontWeight: 500 }}
                >
                  Clear text
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Image Input */}
        {activeTab === 'image' && (
          <div>
            {!selectedFile ? (
              <div 
                className={`dropzone-editorial ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <UploadCloud size={36} color="var(--color-forest)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Drop suspicious screenshot or image here
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginBottom: '1.25rem' }}>
                  Supports PNG, JPG, WebP up to 10MB · Optical Character Recognition
                </p>
                <label className="btn-secondary-quiet" style={{ cursor: 'pointer' }}>
                  Browse Files
                  <input 
                    type="file" 
                    accept="image/png,image/jpeg,image/webp" 
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--color-paper-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <ImageIcon size={24} color="var(--color-forest)" />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button type="button" onClick={removeFile} style={{ color: 'var(--color-verdict-false)', padding: '0.4rem' }}>
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Audio Input */}
        {activeTab === 'audio' && (
          <div>
            {!selectedFile ? (
              <div 
                className={`dropzone-editorial ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Mic size={36} color="var(--color-forest)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Drop WhatsApp voice note or audio clip
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginBottom: '1.25rem' }}>
                  Supports MP3, WAV, M4A up to 25MB · Audio transcription enabled
                </p>
                <label className="btn-secondary-quiet" style={{ cursor: 'pointer' }}>
                  Browse Audio Files
                  <input 
                    type="file" 
                    accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg,audio/aac" 
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--color-paper-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-sage-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-forest)' }}>
                    <Mic size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button type="button" onClick={removeFile} style={{ color: 'var(--color-verdict-false)', padding: '0.4rem' }}>
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: PDF Input */}
        {activeTab === 'pdf' && (
          <div>
            {!selectedFile ? (
              <div 
                className={`dropzone-editorial ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileCheck size={36} color="var(--color-forest)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '1rem', color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Upload official circular or notice PDF
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-muted)', marginBottom: '1.25rem' }}>
                  Supports PDF up to 15MB · Extracts text from circulars and orders
                </p>
                <label className="btn-secondary-quiet" style={{ cursor: 'pointer' }}>
                  Browse PDF Files
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--color-paper-light)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FileCheck size={24} color="var(--color-forest)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button type="button" onClick={removeFile} style={{ color: 'var(--color-verdict-false)', padding: '0.4rem' }}>
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Web Link Input */}
        {activeTab === 'url' && (
          <div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="url"
                className="form-input-editorial"
                placeholder="https://news-outlet.org/article or suspicious domain link"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlTouched(true);
                }}
              />
            </div>
            {urlTouched && urlInput.trim() && !isValidUrl(urlInput) && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-verdict-false)', marginTop: '0.4rem' }}>
                Please enter a valid HTTP or HTTPS web address.
              </p>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={13} /> Protected by SSRF guards. Note that paywalled or intranet URLs may be inaccessible.
            </p>
          </div>
        )}

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
            {isInputValid() ? 'Ready for evidence retrieval.' : 'Provide a claim or file above to verify.'}
          </span>
          <button
            type="button"
            className="btn-forest"
            disabled={!isInputValid() || isAnalyzing}
            onClick={startVerification}
            style={{ 
              padding: '0.75rem 1.6rem', 
              fontSize: '0.9375rem', 
              opacity: isInputValid() && !isAnalyzing ? 1 : 0.6, 
              cursor: isInputValid() && !isAnalyzing ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem'
            }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="spin-loader" />
                <span>Extracting & Ingesting...</span>
              </>
            ) : (
              <>
                <span>Verify Forward</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Benchmark Presets Section */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span className="section-eyebrow">ONE-CLICK EVALUATION</span>
          <h3 style={{ fontSize: '1.35rem', color: 'var(--color-ink)', fontFamily: 'var(--font-serif)' }}>
            Benchmark Presets
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)' }}>
            Select any pre-configured claim forward to inspect structured verdicts and evidence grounded in canonical fixtures.
          </p>
        </div>

        <div className="presets-grid">
          {Object.entries(FIXTURE_MAP).map(([key, item]) => {
            const isSelected = activePresetKey === key;
            const isFalse = item.data.verdict === 'FALSE';
            const isOutdated = item.data.verdict === 'OUTDATED';

            return (
              <div 
                key={key} 
                className="preset-card-editorial"
                onClick={() => selectPreset(key, false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && selectPreset(key, false)}
                style={{
                  border: isSelected ? '1.5px solid var(--color-forest)' : '1px solid var(--color-border)',
                  background: isSelected ? 'var(--color-surface)' : 'var(--color-paper-light)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span 
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: isFalse ? 'var(--color-verdict-false-bg)' : isOutdated ? 'var(--color-verdict-warning-bg)' : 'var(--color-verdict-success-bg)',
                      color: isFalse ? 'var(--color-verdict-false)' : isOutdated ? 'var(--color-verdict-warning)' : 'var(--color-verdict-success)'
                    }}
                  >
                    {item.data.verdict}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-muted)' }}>{item.category}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-ink)', marginBottom: '0.4rem' }}>
                  {item.label}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-ink-secondary)', lineHeight: 1.45 }}>
                  "{item.sampleSnippet}"
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent History Strip */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--color-forest)" />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-ink)', fontFamily: 'var(--font-serif)' }}>
              Recent Audit Log
            </h3>
          </div>
          {historyList.length > 0 && (
            <button 
              type="button" 
              onClick={() => setScreen('history')}
              style={{ fontSize: '0.8125rem', color: 'var(--color-forest)', fontWeight: 600 }}
            >
              View All ({historyList.length}) →
            </button>
          )}
        </div>

        {historyList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <Clock size={24} color="var(--color-ink-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-ink-secondary)' }}>
              Completed verifications will appear here automatically for fast re-examination.
            </p>
          </div>
        ) : (
          <div>
            {historyList.slice(0, 3).map((item) => (
              <div 
                key={item.id} 
                className="history-card-editorial"
                onClick={() => openPastReport(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openPastReport(item)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
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
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
                    {item.modality}
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-ink)', fontWeight: 500 }}>
                    "{item.claim.slice(0, 65)}..."
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
