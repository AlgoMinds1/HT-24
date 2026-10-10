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
  Sparkles, 
  AlertCircle, 
  Play, 
  Pause, 
  Eye, 
  CheckCircle2, 
  Globe,
  HelpCircle,
  RotateCcw,
  AlertTriangle
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
    error,
    clearError,
    retryVerification,
    isMockMode,
    setMockMode
  } = useVerification();

  const [dragActive, setDragActive] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showOcrOverlay, setShowOcrOverlay] = useState(false);

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

  // Determine if Verify button should be enabled
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

  const [uploadWarning, setUploadWarning] = useState(null);

  const validateFile = (file) => {
    setUploadWarning(null);
    if (!file) return false;

    // Check size limit: 20MB upper bound
    if (file.size > 20 * 1024 * 1024) {
      setUploadWarning('File size exceeds the 20MB limit. Please choose a smaller file.');
      return false;
    }

    if (activeTab === 'image') {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type.toLowerCase())) {
        setUploadWarning('Please select a valid image file (JPEG, PNG, WebP, or GIF).');
        return false;
      }
    } else if (activeTab === 'audio') {
      if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
        setUploadWarning('Please select a valid audio file (MP3, WAV, OGG, M4A, or AAC).');
        return false;
      }
    } else if (activeTab === 'pdf') {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadWarning('Please select a valid PDF document.');
        return false;
      }
    }
    return true;
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (activeTab === 'image' && file.type.startsWith('image/')) {
          setImagePreviewUrl(URL.createObjectURL(file));
        }
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        if (activeTab === 'image' && file.type.startsWith('image/')) {
          setImagePreviewUrl(URL.createObjectURL(file));
        }
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setIsPlayingAudio(false);
    setShowOcrOverlay(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const loadSampleFile = (type) => {
    if (type === 'image') {
      const dummyFile = new File(["sample image buffer"], "whatsapp_screenshot_scheme.png", { type: "image/png" });
      setSelectedFile(dummyFile);
      setImagePreviewUrl("https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80");
    } else if (type === 'audio') {
      const dummyFile = new File(["sample audio buffer"], "viral_voice_note_cure.mp3", { type: "audio/mp3" });
      setSelectedFile(dummyFile);
    } else if (type === 'pdf') {
      const dummyFile = new File(["sample pdf buffer"], "gazette_notification_order_2021.pdf", { type: "application/pdf" });
      setSelectedFile(dummyFile);
    }
  };

  return (
    <div className="input-screen-wrapper">
      {/* Dashboard Top Header */}
      <div className="dashboard-header-block">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Claim Verification Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', marginTop: '0.25rem' }}>
            Submit suspicious forwards across 5 supported modalities to run automated multi-agent fact checking.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '1.25rem' }}>
        {/* Verification Failure / Warning Banner */}
        {error && (
          <div className="error-alert-banner" role="alert">
            <div className="error-alert-header">
              <div className="error-alert-title-wrap">
                <AlertTriangle size={20} className="error-alert-icon" />
                <span className="error-alert-title">
                  {error.code ? `Verification Notice: ${error.code}` : 'Verification Notice'}
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
            
            <p className="error-alert-message">{error.message}</p>
            
            {Array.isArray(error.warnings) && error.warnings.length > 0 && (
              <ul className="error-alert-warnings">
                {error.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <div className="error-alert-actions">
              {error.canRetry && (
                <button
                  type="button"
                  className="btn-primary compact-error-btn"
                  onClick={retryVerification}
                >
                  <RotateCcw size={14} />
                  <span>Retry Verification</span>
                </button>
              )}

              {!isMockMode && (error.isConnectionError || error.code === 'RATE_LIMITED' || error.code === 'SERVER_ERROR' || error.code === 'TIMEOUT') && (
                <button
                  type="button"
                  className="btn-secondary compact-error-btn"
                  onClick={() => {
                    setMockMode(true);
                    clearError();
                    setTimeout(() => {
                      retryVerification();
                    }, 50);
                  }}
                >
                  <Sparkles size={14} />
                  <span>Switch to Demo Mode & Retry</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Client-side File Upload Warning */}
        {uploadWarning && (
          <div className="upload-warning-banner" role="alert">
            <AlertCircle size={16} />
            <span>{uploadWarning}</span>
            <button type="button" className="error-dismiss-btn" onClick={() => setUploadWarning(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Five Input Tabs */}
        <div className="tabs-navigation">
          <button
            className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => { setActiveTab('text'); clearFile(); }}
          >
            <FileText size={18} />
            <span>Text Forward</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => { setActiveTab('image'); clearFile(); }}
          >
            <ImageIcon size={18} />
            <span>Image / Screenshot</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audio'); clearFile(); }}
          >
            <Mic size={18} />
            <span>Voice / Audio</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pdf'); clearFile(); }}
          >
            <FileCheck size={18} />
            <span>PDF Circular</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => { setActiveTab('url'); clearFile(); }}
          >
            <LinkIcon size={18} />
            <span>Link / URL</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="tab-content">
          {/* 1. Text Tab */}
          {activeTab === 'text' && (
            <div>
              <textarea
                className="textarea-custom"
                placeholder="Paste suspicious forward, announcement, social media post, or WhatsApp message text here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <div className="textarea-footer">
                <span>{textInput.trim().length < 10 ? '⚠️ Min 10 characters required to verify' : '✅ Ready for analysis'}</span>
                <span>{textInput.trim().length} characters • {textInput.trim() ? textInput.trim().split(/\s+/).length : 0} words</span>
              </div>
            </div>
          )}

          {/* 2. Image Tab */}
          {activeTab === 'image' && (
            <div>
              {!selectedFile ? (
                <div>
                  <div
                    className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('image-upload-input').click()}
                  >
                    <UploadCloud size={44} color="var(--accent-terracotta)" />
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Upload Screenshot or Forward Image
                      </strong>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                        Drag & drop image here, or click to browse (.PNG, .JPG, .WEBP)
                      </p>
                    </div>
                    <input
                      id="image-upload-input"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                  <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => loadSampleFile('image')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-terracotta)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Or load interactive sample screenshot
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="file-preview-card">
                    <div className="file-info-group">
                      <ImageIcon size={30} color="var(--accent-terracotta)" />
                      <div>
                        <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{selectedFile.name}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {formatFileSize(selectedFile.size || 240000)} • Image Attachment
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="feedback-btn"
                        onClick={() => setShowOcrOverlay(!showOcrOverlay)}
                      >
                        <Eye size={14} />
                        <span>{showOcrOverlay ? 'Hide OCR' : 'Preview OCR'}</span>
                      </button>
                      <button
                        onClick={clearFile}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.3rem' }}
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {showOcrOverlay && (
                    <div style={{ padding: '1rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-terracotta)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Simulated OCR Claim Extraction:
                      </span>
                      <p style={{ marginTop: '0.35rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                        "URGENT: YONO Bank account has been BLOCKED due to expired KYC. Update immediately at sbi-kyc-quickupdate.net..."
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Audio Tab */}
          {activeTab === 'audio' && (
            <div>
              {!selectedFile ? (
                <div>
                  <div
                    className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('audio-upload-input').click()}
                  >
                    <Mic size={44} color="var(--accent-terracotta)" />
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Upload Voice Note or Audio Forward
                      </strong>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                        Supports WhatsApp voice notes and audio clips (.MP3, .WAV, .M4A, .OGG)
                      </p>
                    </div>
                    <input
                      id="audio-upload-input"
                      type="file"
                      accept="audio/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                  <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => loadSampleFile('audio')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-terracotta)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Or load interactive sample viral audio forward
                    </button>
                  </div>
                </div>
              ) : (
                <div className="file-preview-card">
                  <div className="file-info-group">
                    <button
                      type="button"
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-terracotta)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      {isPlayingAudio ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                    </button>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(selectedFile.size || 520000)} • 0:48 duration • {isPlayingAudio ? 'Playing simulated audio...' : 'Audio loaded'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. PDF Tab */}
          {activeTab === 'pdf' && (
            <div>
              {!selectedFile ? (
                <div>
                  <div
                    className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('pdf-upload-input').click()}
                  >
                    <FileCheck size={44} color="var(--accent-terracotta)" />
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        Upload Government Circular or Document PDF
                      </strong>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                        Drag and drop official order, Gazette notification, or PDF advisory (.PDF)
                      </p>
                    </div>
                    <input
                      id="pdf-upload-input"
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                  <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => loadSampleFile('pdf')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-terracotta)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Or load interactive sample gazette circular
                    </button>
                  </div>
                </div>
              ) : (
                <div className="file-preview-card">
                  <div className="file-info-group">
                    <FileCheck size={30} color="var(--accent-terracotta)" />
                    <div>
                      <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(selectedFile.size || 820000)} • 2 pages • PDF Circular
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. URL Tab */}
          {activeTab === 'url' && (
            <div className="url-input-container">
              <div className="url-input-wrapper">
                <LinkIcon size={20} className="url-icon" />
                <input
                  type="url"
                  className={`input-custom ${urlTouched && urlInput && !isValidUrl(urlInput) ? 'invalid' : ''}`}
                  placeholder="https://news-portal.com/viral-scheme-announcement"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    setUrlTouched(true);
                  }}
                  onBlur={() => setUrlTouched(true)}
                />
              </div>
              {urlTouched && urlInput && !isValidUrl(urlInput) && (
                <div className="url-error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={14} />
                  <span>Please enter a valid URL starting with http:// or https://</span>
                </div>
              )}
              {isValidUrl(urlInput) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <Globe size={16} color="var(--accent-terracotta)" />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Target Domain: <strong>{new URL(urlInput).hostname}</strong>
                  </span>
                  <span style={{ marginLeft: 'auto', color: 'var(--verdict-supported)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={14} /> URL Valid
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="verify-action-bar">
          <button
            className="btn-primary"
            disabled={!isInputValid()}
            onClick={startVerification}
          >
            <span>Run Multi-Agent Verification</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Quick Test Fixture Presets */}
      <div className="presets-section">
        <div className="presets-title">
          <Sparkles size={16} color="var(--accent-terracotta)" />
          <span>Quick Test Scenarios (Sample Fixture Payloads)</span>
        </div>
        <div className="presets-grid">
          {Object.entries(FIXTURE_MAP).map(([key, item]) => (
            <div
              key={key}
              className={`preset-card ${activePresetKey === key ? 'active' : ''}`}
              onClick={() => selectPreset(key)}
            >
              <span className={`preset-badge ${key === 'outdated_gov' ? 'outdated' : key === 'false_health' ? 'false' : 'kyc'}`}>
                {item.label}
              </span>
              <p className="preset-text">{item.sampleSnippet}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
