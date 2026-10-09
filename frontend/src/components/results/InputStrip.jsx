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
  Share2
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
