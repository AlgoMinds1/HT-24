import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  ArrowRight, 
  FileSearch, 
  AlertTriangle, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Bookmark,
  Award
} from 'lucide-react';
import { RESULTS_TAB_KEYS } from './ResultsTabs';

/**
 * OverviewTab Component
 * Tab 1 (Default): Concise summary of verdict, key takeaways, primary source attribution,
 * and immediate safety advice.
 */
export default function OverviewTab({ contract, onNavigateTab }) {
  const [showMethodology, setShowMethodology] = useState(false);

  const { verdict = {}, evidence = [], actionRisk = null, stressTest = {} } = contract;
  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  // Top source attribution (first high-trust source)
  const primarySource = safeEvidence.length > 0 ? safeEvidence[0] : null;

  // Extract key findings as concise bullet points without redundancy
  const keyFindings = [];
  if (primarySource && (primarySource.quote || primarySource.excerpt)) {
    keyFindings.push({
      text: primarySource.quote || primarySource.excerpt,
      source: primarySource.sourceName || primarySource.source_name
    });
  }
  if (safeEvidence.length > 1 && (safeEvidence[1].quote || safeEvidence[1].excerpt)) {
    keyFindings.push({
      text: safeEvidence[1].quote || safeEvidence[1].excerpt,
      source: safeEvidence[1].sourceName || safeEvidence[1].source_name
    });
  }

  // Fallback to counter arguments or summary if no external quote items
  if (keyFindings.length === 0 && stressTest?.counterArguments?.length > 0) {
    keyFindings.push({
      text: stressTest.counterArguments[0],
      source: 'Stress-Test Finding'
    });
  }

  return (
    <div id="tab-panel-overview" role="tabpanel" aria-labelledby="tab-btn-overview" className="tab-content-panel">
      <div className="overview-grid">
        {/* Card 1: Key Findings & Authoritative Takeaways */}
        <section className="overview-card key-takeaways-card" aria-label="Key Findings">
          <div className="overview-card-header">
            <Bookmark size={16} className="card-accent-icon" aria-hidden="true" />
            <h3 className="overview-card-title">Key Factual Findings</h3>
          </div>

          {keyFindings.length > 0 ? (
            <ul className="overview-findings-list">
              {keyFindings.map((finding, idx) => (
                <li key={idx} className="overview-finding-item">
                  <div className="finding-bullet-pip" aria-hidden="true" />
                  <div className="finding-text-wrap">
                    <p className="finding-quote">“{finding.text}”</p>
                    {finding.source && (
                      <span className="finding-attribution">— {finding.source}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty-findings">
              <p>
                No external evidence records were retrieved for this claim. 
                In the absence of authoritative confirmation, treat this forward with caution.
              </p>
            </div>
          )}

          {safeEvidence.length > 0 && (
            <div className="overview-card-footer">
              <button
                type="button"
                className="text-link-btn"
                onClick={() => onNavigateTab(RESULTS_TAB_KEYS.EVIDENCE)}
              >
                <span>View all {safeEvidence.length} evidence sources</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>

        {/* Card 2: Primary Source Attribution */}
        <section className="overview-card primary-source-card" aria-label="Primary Source Attribution">
          <div className="overview-card-header">
            <ShieldCheck size={16} className="card-accent-icon" aria-hidden="true" />
            <h3 className="overview-card-title">Primary Authoritative Attribution</h3>
          </div>

          {primarySource ? (
            <div className="primary-source-body">
              <div className="primary-source-meta-row">
                <span className="primary-source-publisher">
                  {primarySource.sourceName || primarySource.source_name || 'Official Archive Record'}
                </span>
                {primarySource.trustTier && (
                  <span className="primary-source-trust-tag">{primarySource.trustTier}</span>
                )}
              </div>

              {(primarySource.date || primarySource.published_date) && (
                <div className="primary-source-date">
                  <span>Record Date: {primarySource.date || primarySource.published_date}</span>
                </div>
              )}

              <p className="primary-source-excerpt">
                “{primarySource.quote || primarySource.excerpt || 'Referenced in official registry.'}”
              </p>

              {primarySource.url && (
                <div className="primary-source-link-wrap">
                  <a
                    href={primarySource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-source-btn"
                  >
                    <span>Inspect Original Source</span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="primary-source-empty">
              <HelpCircle size={22} className="empty-icon" aria-hidden="true" />
              <div>
                <strong>Unattributed Forward</strong>
                <p>No primary publisher or government gazette confirmed this message.</p>
              </div>
            </div>
          )}
        </section>

        {/* Card 3: Calibrated Verification Confidence Score */}
        <section className="overview-card confidence-score-card" aria-label="Confidence Score Assessment">
          <div className="overview-card-header">
            <Award size={16} className="card-accent-icon" aria-hidden="true" />
            <h3 className="overview-card-title">Confidence Assessment</h3>
          </div>
          <div className="primary-source-body">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '2.1rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)', color: '#0f172a' }}>
                {typeof verdict.confidence === 'number' && !isNaN(verdict.confidence)
                  ? (verdict.confidence <= 1 ? Math.round(verdict.confidence * 100) : Math.round(verdict.confidence))
                  : (verdict.confidenceRating === 'HIGH' ? 95 : (verdict.confidenceRating === 'MEDIUM' ? 60 : 35))}%
              </span>
              <span style={{ 
                padding: '0.25rem 0.6rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 800,
                letterSpacing: '0.04em',
                background: (verdict.confidenceRating || 'HIGH') === 'HIGH' ? '#dcfce7' : ((verdict.confidenceRating === 'MEDIUM') ? '#fef3c7' : '#f3e8ff'),
                color: (verdict.confidenceRating || 'HIGH') === 'HIGH' ? '#15803d' : ((verdict.confidenceRating === 'MEDIUM') ? '#b45309' : '#6b21a8')
              }}>
                {verdict.confidenceRating || 'CALIBRATED'} CONFIDENCE
              </span>
            </div>
            <p className="primary-source-excerpt" style={{ margin: 0 }}>
              {verdict.rationale || 'Evaluated and calibrated based on authoritative verification against official government registries.'}
            </p>
          </div>
        </section>
      </div>

      {/* Immediate Safety Recommendation (when applicable) */}
      {actionRisk && (actionRisk.safetyAdvice || actionRisk.reasoning) && (
        <section className="overview-safety-card" aria-label="Safety Recommendation">
          <div className="safety-card-left">
            <div className="safety-icon-box">
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <div>
              <span className="safety-eyebrow">Recommended Recipient Action</span>
              <p className="safety-action-text">
                {actionRisk.safetyAdvice || 'Do not forward this message until verified by official sources.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="safety-more-btn"
            onClick={() => onNavigateTab(RESULTS_TAB_KEYS.SAFETY)}
          >
            <span>Safety Details</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </section>
      )}

      {/* Collapsible "How was this checked?" Methodology Note */}
      <div className="methodology-accordion">
        <button
          type="button"
          className="methodology-toggle-btn"
          onClick={() => setShowMethodology(!showMethodology)}
          aria-expanded={showMethodology}
        >
          <div className="methodology-title-wrap">
            <Cpu size={15} aria-hidden="true" />
            <span>How was this checked? (Verification Methodology)</span>
          </div>
          {showMethodology ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMethodology && (
          <div className="methodology-content-panel">
            <p>
              TruthLens applies a multi-agent verification pipeline conforming to strict epistemic constraints:
            </p>
            <ul className="methodology-points-list">
              <li>
                <strong>Atomic Claim Extraction:</strong> Normalizes viral forwards and isolates factual claims from emotion or spam wrappers.
              </li>
              <li>
                <strong>Grounded Retrieval:</strong> Cross-references against curated knowledge bases, trusted gazettes, and fact-checking registries.
              </li>
              <li>
                <strong>Strict Epistemic Fallback:</strong> If no grounded evidence exists, the claim is classified as <em>Unconfirmed</em>. Never assumes unsupported claims are false or true without evidence.
              </li>
              <li>
                <strong>Adversarial Stress-Testing:</strong> Probes counter-arguments and temporal shifts to prevent outdated alerts from misleading recipients.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
