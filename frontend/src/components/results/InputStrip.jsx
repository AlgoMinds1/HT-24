import React, { useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  FileCheck, 
  Globe, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Database,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Camera,
  Cpu,
  Layers,
  MapPin,
  Calendar,
  AlertTriangle,
  Compass,
  Maximize2
} from 'lucide-react';

/**
 * InputStrip Component
 * 
 * Establishes what content is being verified, preserves connection to the forward,
 * cleanly separates the raw input from the extracted atomic claim,
 * and includes a restrained mock/demo indicator.
 * 
 * @param {Object} props
 * @param {Object} props.input - Input object conforming to VerdictContract.input
 * @param {'mock'|'live'} [props.mode='mock'] - Execution mode
 */
export default function InputStrip({ input = {}, mode = 'mock' }) {
  const [expanded, setExpanded] = useState(false);
  const [showForensics, setShowForensics] = useState(true);

  const {
    type = 'text',
    originalContent = '',
    displayName = '',
    extractedClaim = '',
    sourcePlatform = '',
    receivedAt = ''
  } = input;

  const getMediaIcon = (t) => {
    switch (t) {
      case 'image': return <ImageIcon size={16} aria-hidden="true" />;
      case 'audio': return <Mic size={16} aria-hidden="true" />;
      case 'pdf': return <FileCheck size={16} aria-hidden="true" />;
      case 'url': return <Globe size={16} aria-hidden="true" />;
      case 'text':
      default: return <FileText size={16} aria-hidden="true" />;
    }
  };

  const isLongContent = originalContent && originalContent.length > 180;
  const displayedContent = isLongContent && !expanded 
    ? `${originalContent.substring(0, 180)}...` 
    : originalContent;

  return (
    <section className="input-strip-card" aria-label="Verified forward details">
      {/* Top Header Row with Type, Origin, and Mock Indicator */}
      <div className="input-strip-header">
        <div className="input-strip-meta-tags">
          <span className="media-type-pill" title={`Input type: ${type}`}>
            {getMediaIcon(type)}
            <span>{type.toUpperCase()}</span>
          </span>

          {sourcePlatform && (
            <span className="source-platform-pill">
              <Share2 size={13} aria-hidden="true" />
              <span>{sourcePlatform}</span>
            </span>
          )}

          {receivedAt && (
            <span className="timestamp-pill" title={`Received timestamp: ${receivedAt}`}>
              {receivedAt.includes('T') ? receivedAt.split('T')[0] : receivedAt}
            </span>
          )}
        </div>

        {mode === 'mock' && (
          <div className="mock-fixture-badge" role="status" aria-label="Mock verification result">
            <span className="mock-status-dot" aria-hidden="true"></span>
            <span>Mock Fixture Mode</span>
          </div>
        )}
      </div>

      {/* Extracted Claim */}
      <div className="input-strip-claim-box">
        <div className="strip-field-label">
          <Sparkles size={14} className="accent-icon" aria-hidden="true" />
          <span>Extracted Factual Claim</span>
        </div>
        {extractedClaim ? (
          <blockquote className="extracted-claim-text">
            “{extractedClaim}”
          </blockquote>
        ) : (
          <p className="claim-missing-fallback">
            Claim extraction was inconclusive or not specified for this input.
          </p>
        )}
      </div>

      {/* Original Content / Forward Excerpt */}
      {originalContent && (
        <div className="input-strip-raw-box">
          <div className="raw-content-header">
            <span className="strip-subfield-label">Original Forward / Source Message</span>
            {isLongContent && (
              <button
                type="button"
                className="toggle-expand-btn"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
              >
                <span>{expanded ? 'Show less' : 'Show full text'}</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
          <p className="raw-content-text">
            {displayedContent}
          </p>
        </div>
      )}

      {/* Extracted Speech Transcript (Audio) */}
      {input.extraction?.transcript && (
        <div className="input-strip-raw-box transcript-box">
          <div className="raw-content-header">
            <span className="strip-subfield-label">Speech Transcript (Audio Note)</span>
          </div>
          <p className="raw-content-text transcript-text">
            “{input.extraction.transcript}”
          </p>
        </div>
      )}

      {/* Extracted Document / OCR Text (Image / PDF) */}
      {input.extraction?.extractedText && input.extraction.extractedText !== originalContent && (
        <div className="input-strip-raw-box ocr-box">
          <div className="raw-content-header">
            <span className="strip-subfield-label">
              {type === 'image' ? 'OCR Visual Text Extracted' : 'Extracted Document Text'}
            </span>
          </div>
          <p className="raw-content-text">
            {input.extraction.extractedText.length > 300 
              ? `${input.extraction.extractedText.substring(0, 300)}...` 
              : input.extraction.extractedText}
          </p>
        </div>
      )}

      {/* 2A + 2B Forensic & Evidence Fusion Section for Image Inputs */}
      {type === 'image' && (input.extraction?.evidenceFusion || input.extraction?.exifAnalysis) && (() => {
        const fusion = input.extraction?.evidenceFusion;
        const exifAnalysis = input.extraction?.exifAnalysis;
        const manipRisk = (fusion?.metadataAnalysis?.manipulationRisk || exifAnalysis?.manipulationRisk || 'UNKNOWN').toUpperCase();
        const fields = fusion?.metadataAnalysis?.fields || exifAnalysis?.metadataFields || {};
        const engine = fusion?.visualAnalysis?.engine;
        const factChecks = input.extraction?.factCheckResults || [];

        const getRiskBadge = (r) => {
          switch (r) {
            case 'HIGH':
              return { label: 'High Manipulation Risk', color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5', icon: <AlertTriangle size={13} /> };
            case 'MEDIUM':
              return { label: 'Moderate Manipulation Risk', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D', icon: <AlertTriangle size={13} /> };
            case 'LOW':
              return { label: 'Authentic / Low Risk', color: '#166534', bg: '#F0FDF4', border: '#86EFAC', icon: <ShieldCheck size={13} /> };
            default:
              return { label: 'Metadata Stripped / Unknown', color: '#475569', bg: '#F8FAFC', border: '#CBD5E1', icon: <ShieldAlert size={13} /> };
          }
        };

        const badge = getRiskBadge(manipRisk);

        return (
          <div className="input-strip-raw-box forensics-fusion-box" style={{ background: '#FAF8F5', border: '1px solid #E2D9CC', borderRadius: '10px', padding: '1rem', marginTop: '0.75rem' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setShowForensics(!showForensics)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Layers size={16} style={{ color: '#2C5E43' }} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A2E22' }}>
                  Forensic & Visual Evidence Fusion (Step 2A + 2B)
                </span>
                <span style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.3rem', 
                  padding: '0.2rem 0.55rem', 
                  borderRadius: '999px', 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  background: badge.bg, 
                  color: badge.color, 
                  border: `1px solid ${badge.border}` 
                }}>
                  {badge.icon}
                  {badge.label}
                </span>
              </div>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '0.2rem' }}
                aria-label={showForensics ? 'Collapse forensics' : 'Expand forensics'}
              >
                {showForensics ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>

            {showForensics && (
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Visual OCR Engine & Fact-Check Cross-Check Highlights */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  {engine && (
                    <span style={{ background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE', borderRadius: '6px', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <Cpu size={12} />
                      Visual Model: {engine}
                    </span>
                  )}
                  <span style={{ background: factChecks.length > 0 ? '#ECFDF5' : '#F1F5F9', color: factChecks.length > 0 ? '#065F46' : '#475569', border: `1px solid ${factChecks.length > 0 ? '#A7F3D0' : '#E2E8F0'}`, borderRadius: '6px', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Database size={12} />
                    Fact-Check Registry: {factChecks.length > 0 ? `${factChecks.length} debunks found` : '0 prior debunks'}
                  </span>
                </div>

                {/* 6-Field Metadata Signals Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                  gap: '0.6rem', 
                  background: '#FFFFFF', 
                  border: '1px solid #E8E2D6', 
                  borderRadius: '8px', 
                  padding: '0.75rem' 
                }}>
                  {/* Field 1: DateTimeOriginal */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={11} /> DateTimeOriginal
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#222' }}>
                      {fields.dateTimeOriginal?.value || 'No capture timestamp'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: fields.dateTimeOriginal?.risk === 'HIGH' ? '#B91C1C' : '#666' }}>
                      {fields.dateTimeOriginal?.finding || 'Was the image captured on claimed date?'}
                    </span>
                  </div>

                  {/* Field 2: Make / Model */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Camera size={11} /> Make / Model
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#222' }}>
                      {fields.makeModel?.value || 'No camera tag (screenshot/stripped)'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#666' }}>
                      {fields.makeModel?.finding || 'Real camera vs screenshot tool'}
                    </span>
                  </div>

                  {/* Field 3: Software */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Cpu size={11} /> Software
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: fields.software?.risk === 'HIGH' ? '#B91C1C' : '#222' }}>
                      {fields.software?.value || 'None (Clean)'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: fields.software?.risk === 'HIGH' ? '#B91C1C' : '#666' }}>
                      {fields.software?.finding || 'Photoshop / editing software → manipulation risk flag'}
                    </span>
                  </div>

                  {/* Field 4: GPS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={11} /> GPS (Lat/Lon)
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#222' }}>
                      {fields.gps?.value ? `${fields.gps.value.latitude}, ${fields.gps.value.longitude}` : 'No GPS tag embedded'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#666' }}>
                      {fields.gps?.finding || 'Does location match claimed origin?'}
                    </span>
                  </div>

                  {/* Field 5: ImageWidth/Height */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Maximize2 size={11} /> ImageWidth / Height
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#222' }}>
                      {fields.imageDimensions?.value || 'Standard resolution'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: fields.imageDimensions?.risk === 'MEDIUM' ? '#B45309' : '#666' }}>
                      {fields.imageDimensions?.finding || 'Unusually small → screenshot crop'}
                    </span>
                  </div>

                  {/* Field 6: Orientation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Compass size={11} /> Orientation
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#222' }}>
                      {fields.orientation?.value || 'Normal (Standard)'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: fields.orientation?.risk === 'MEDIUM' ? '#B45309' : '#666' }}>
                      {fields.orientation?.finding || 'Flipped/rotated → re-shared image'}
                    </span>
                  </div>
                </div>

                {/* Fusion Summary */}
                {fusion?.fusionSummary && (
                  <div style={{ fontSize: '0.72rem', color: '#555', background: '#F5F2EB', padding: '0.45rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #2C5E43' }}>
                    <strong>Fusion Summary:</strong> {fusion.fusionSummary}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Extraction Warnings & Caveats */}
      {input.extraction?.warnings && input.extraction.warnings.length > 0 && (
        <div className="extraction-warnings-bar" role="status">
          <span className="warnings-heading">Ingestion Caveat:</span>
          <ul className="warnings-list">
            {input.extraction.warnings.map((warn, idx) => (
              <li key={idx} className="warning-pill">• {warn}</li>
            ))}
          </ul>
        </div>
      )}

      {displayName && displayName !== originalContent && (
        <div className="input-strip-filename">
          <span className="filename-label">Attachment / Resource:</span>
          <span className="filename-value">{displayName}</span>
        </div>
      )}
    </section>
  );
}
