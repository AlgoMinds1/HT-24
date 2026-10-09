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
  AlertCircle
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
    startVerification
  } = useVerification();

  const [dragActive, setDragActive] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);

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

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="input-screen-wrapper">
      <div className="input-hero">
        <h1>Verify Suspicious Forwards & Claims</h1>
        <p>
          Analyze viral WhatsApp forwards, screenshots, audio notes, advisories, and KYC messages
          against authoritative registries and multi-agent evidence.
        </p>
      </div>

      <div className="glass-card">
        {/* Five Input Tabs */}
        <div className="tabs-navigation">
          <button
            className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => { setActiveTab('text'); setSelectedFile(null); }}
          >
            <FileText size={18} />
            <span>Text Forward</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => { setActiveTab('image'); setSelectedFile(null); }}
          >
            <ImageIcon size={18} />
            <span>Image / Screenshot</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => { setActiveTab('audio'); setSelectedFile(null); }}
          >
            <Mic size={18} />
            <span>Voice / Audio</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
            onClick={() => { setActiveTab('pdf'); setSelectedFile(null); }}
          >
            <FileCheck size={18} />
            <span>PDF Circular</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => { setActiveTab('url'); setSelectedFile(null); }}
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
                <span>Min 10 characters required</span>
                <span>{textInput.trim().length} characters | {textInput.trim() ? textInput.trim().split(/\s+/).length : 0} words</span>
              </div>
            </div>
          )}

          {/* 2. Image Tab */}
          {activeTab === 'image' && (
            <div>
              {!selectedFile ? (
                <div
                  className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('image-upload-input').click()}
                >
                  <UploadCloud size={40} color="var(--accent-cyan)" />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>Upload Screenshot or Claim Image</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Drag and drop image here, or click to browse (.PNG, .JPG, .WEBP)
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
              ) : (
                <div className="file-preview-card">
                  <div className="file-info-group">
                    <ImageIcon size={28} color="var(--accent-cyan)" />
                    <div>
                      <strong style={{ display: 'block' }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(selectedFile.size)} • Image Attachment
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Audio Tab */}
          {activeTab === 'audio' && (
            <div>
              {!selectedFile ? (
                <div
                  className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('audio-upload-input').click()}
                >
                  <Mic size={40} color="var(--accent-cyan)" />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>Upload Voice Note / Audio Recording</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Supports WhatsApp voice notes and audio forwards (.MP3, .WAV, .M4A, .OGG)
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
              ) : (
                <div className="file-preview-card">
                  <div className="file-info-group">
                    <Mic size={28} color="var(--accent-cyan)" />
                    <div>
                      <strong style={{ display: 'block' }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(selectedFile.size)} • Audio Recording
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
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
                <div
                  className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('pdf-upload-input').click()}
                >
                  <FileCheck size={40} color="var(--accent-cyan)" />
                  <div>
                    <strong style={{ fontSize: '1rem' }}>Upload Government Circular or Document PDF</strong>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Drag and drop PDF circular, Gazette order, or gazetted advisory (.PDF)
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
              ) : (
                <div className="file-preview-card">
                  <div className="file-info-group">
                    <FileCheck size={28} color="var(--accent-cyan)" />
                    <div>
                      <strong style={{ display: 'block' }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(selectedFile.size)} • PDF Document
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
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
                  placeholder="https://example.com/viral-article-or-forward"
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
            <span>Verify Forward</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Quick Test Fixture Presets */}
      <div className="presets-section">
        <div className="presets-title">
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span>Quick Test Scenarios (Sample Fixture Data)</span>
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
