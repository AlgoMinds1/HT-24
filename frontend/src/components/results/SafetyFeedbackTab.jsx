import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Check, 
  Download, 
  Info, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  Share2,
  Trash2,
  PhoneCall,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LifeBuoy,
  Send,
  AlertOctagon,
  CheckSquare,
  Square
} from 'lucide-react';

/**
 * SafetyFeedbackTab Component
 * Tab 4: Recipient Risk Assessment, What If I Shared Damage Control, User Feedback, and Report Export.
 */
export default function SafetyFeedbackTab({ contract, onCopySummary, copied = false, onDownloadJson }) {
  const [feedback, setFeedback] = useState(null); // 'helpful' | 'review' | null
  const [copiedRetraction, setCopiedRetraction] = useState(false);
  const [openWhatIfShared, setOpenWhatIfShared] = useState(true);
  const [checklist, setChecklist] = useState({
    deleted: false,
    retracted: false,
    warned: false,
    secured: false
  });

  const { actionRisk = null, verdict = {}, input = {} } = contract;

  const level = actionRisk?.level || 'UNKNOWN';
  const category = (actionRisk?.category || '').toUpperCase();
  const safetyAdvice = actionRisk?.safetyAdvice || '';
  const reasoning = actionRisk?.reasoning || '';
  const warningFlag = actionRisk?.warningFlag || '';
  const requestedAction = actionRisk?.requestedAction || '';

  const claimText = input?.extractedClaim || input?.originalContent || 'this claim';
  const verdictStatus = verdict?.status || 'CANNOT_CONFIRM';
  const explanation = verdict?.explanation || safetyAdvice || '';

  const isFinancialOrPhishing = category.includes('FINANCIAL') || category.includes('PHISHING') || level === 'CRITICAL';
  const isHealth = category.includes('HEALTH');

  const getRiskIcon = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
      case 'HIGH':
        return <ShieldAlert size={28} className="safety-badge-icon icon-critical" aria-hidden="true" />;
      case 'MEDIUM':
        return <AlertTriangle size={28} className="safety-badge-icon icon-medium" aria-hidden="true" />;
      case 'LOW':
        return <ShieldCheck size={28} className="safety-badge-icon icon-low" aria-hidden="true" />;
      case 'UNKNOWN':
      default:
        return <HelpCircle size={28} className="safety-badge-icon icon-unknown" aria-hidden="true" />;
    }
  };

  const getRiskLabel = (lvl) => {
    switch (lvl) {
      case 'CRITICAL': return 'Critical Threat Level';
      case 'HIGH': return 'High Risk Warning';
      case 'MEDIUM': return 'Moderate Caution';
      case 'LOW': return 'Low / Safe Message';
      case 'UNKNOWN':
      default: return 'Standard Risk Profile';
    }
  };

  // Generate polite, context-aware retraction message ready for group chats
  const generateRetractionText = () => {
    if (verdictStatus === 'FALSE') {
      return `⚠️ CORRECTION on the message I forwarded earlier:\n` +
             `I checked the claim: "${claimText}" via TruthLens and authoritative records.\n` +
             `❌ VERDICT: FALSE / FABRICATED\n` +
             `📌 FACT: ${explanation}\n` +
             `👉 Please DO NOT forward it further or click any links in that message.`;
    }
    if (verdictStatus === 'OUTDATED') {
      return `⚠️ UPDATE on the message I forwarded earlier:\n` +
             `The claim about "${claimText}" is OUTDATED / EXPIRED.\n` +
             `📌 FACT: ${explanation}\n` +
             `👉 Check official government circulars before taking any action.`;
    }
    if (verdictStatus === 'PARTLY_SUPPORTED') {
      return `⚠️ NOTE on the message I forwarded earlier:\n` +
             `The forward regarding "${claimText}" is PARTLY MISLEADING.\n` +
             `📌 CONTEXT: ${explanation}\n` +
             `👉 Treat with caution and avoid circulating unconfirmed details.`;
    }
    if (verdictStatus === 'CANNOT_CONFIRM') {
      return `⚠️ CAUTION on the message I forwarded earlier:\n` +
             `The claim "${claimText}" could not be confirmed by official sources.\n` +
             `📌 NOTE: ${explanation}\n` +
             `👉 Please hold off on forwarding until verified.`;
    }
    return `✅ FACT-CHECK UPDATE:\n` +
           `The forward regarding "${claimText}" is confirmed authentic.\n` +
           `📌 DETAILS: ${explanation}`;
  };

  const handleCopyRetraction = () => {
    const text = generateRetractionText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedRetraction(true);
    setChecklist(prev => ({ ...prev, retracted: true }));
    setTimeout(() => setCopiedRetraction(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = generateRetractionText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setChecklist(prev => ({ ...prev, retracted: true }));
  };

  const toggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const completedStepsCount = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 4) * 100);

  return (
    <div id="tab-panel-safety" role="tabpanel" aria-labelledby="tab-btn-safety" className="tab-content-panel">
      
      {/* 1. Recipient Harm & Risk Assessment Card */}
      <section className="safety-evaluation-card" aria-label="Risk Assessment">
        <div className="safety-eval-header">
          <div className="safety-eval-badge-group">
            {getRiskIcon(level)}
            <div>
              <span className="safety-eval-eyebrow">Recipient Harm Evaluation</span>
              <h3 className="safety-eval-title">{getRiskLabel(level)}</h3>
            </div>
          </div>

          {category && (
            <span className="safety-category-chip">
              {category.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {warningFlag && (
          <div className="safety-urgent-callout" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{warningFlag}</span>
          </div>
        )}

        <div className="safety-grid-cards">
          {/* Card: Concrete Recommended Actions */}
          <div className="safety-subcard practical-advice-card">
            <div className="subcard-title-row">
              <CheckCircle2 size={16} className="subcard-accent-icon" aria-hidden="true" />
              <h4 className="subcard-heading">Practical Safety Guidance</h4>
            </div>
            <p className="subcard-body-text">
              {safetyAdvice || 'Do not forward unconfirmed claims to group chats. Check official verified portals before sharing.'}
            </p>
          </div>

          {/* Card: Message Prompted Action */}
          {requestedAction && (
            <div className="safety-subcard prompted-action-card">
              <div className="subcard-title-row">
                <Lock size={16} className="subcard-accent-icon" aria-hidden="true" />
                <h4 className="subcard-heading">What the Message Urges Recipient to Do</h4>
              </div>
              <p className="subcard-body-text italic">
                “{requestedAction}”
              </p>
            </div>
          )}
        </div>

        {reasoning && (
          <div className="safety-rationale-box">
            <strong>Why this risk level was assigned:</strong>
            <p>{reasoning}</p>
          </div>
        )}
      </section>

      {/* 2. "WHAT IF I ALREADY SHARED THIS?" Damage Control & Containment Guide */}
      <section className="what-if-shared-card" aria-label="What If I Already Shared Action Guide">
        <div 
          className="what-if-shared-header"
          onClick={() => setOpenWhatIfShared(!openWhatIfShared)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenWhatIfShared(!openWhatIfShared); } }}
          aria-expanded={openWhatIfShared}
        >
          <div className="what-if-shared-badge-group">
            <AlertOctagon size={24} className="what-if-shared-icon" aria-hidden="true" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 className="what-if-shared-title">What If I Already Shared This?</h3>
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  background: 'rgba(200, 90, 50, 0.12)', 
                  color: 'var(--accent-terracotta, #C85A32)', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '4px' 
                }}>
                  Damage Control Guide
                </span>
              </div>
              <p className="what-if-shared-sub">
                Follow this incident response checklist to halt misinformation propagation and protect recipients.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="toggle-icon-btn"
            aria-label={openWhatIfShared ? 'Collapse damage control' : 'Expand damage control'}
          >
            {openWhatIfShared ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {openWhatIfShared && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            
            {/* Action 1: Pre-formatted Counter-Forward / Retraction Message */}
            <div className="retraction-generator-box">
              <div className="retraction-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={14} style={{ color: 'var(--color-forest, #263A2D)' }} />
                  <strong>Ready-to-Send Retraction Message</strong> (Post in the group chat you forwarded to)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  One-Click Copy & Share
                </span>
              </div>

              <div className="retraction-textarea" tabIndex={0} role="region" aria-label="Generated retraction message text">
                {generateRetractionText()}
              </div>

              <div className="retraction-actions-row">
                <button
                  type="button"
                  className="retraction-copy-btn"
                  onClick={handleCopyRetraction}
                >
                  {copiedRetraction ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedRetraction ? 'Retraction Copied to Clipboard!' : 'Copy Retraction Text'}</span>
                </button>

                <button
                  type="button"
                  className="retraction-wa-btn"
                  onClick={handleWhatsAppShare}
                >
                  <Send size={14} />
                  <span>Send Retraction via WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Action 2: Step-by-Step Incident Containment Steps */}
            <div className="containment-steps-grid">
              
              {/* Step 1: Recall / Delete */}
              <div className="containment-step-card">
                <div className="step-card-num-row">
                  <Trash2 size={13} />
                  <span>Step 1: Delete or Recall</span>
                </div>
                <h4 className="step-card-title">Delete for Everyone</h4>
                <p className="step-card-desc">
                  On WhatsApp or Telegram, tap and hold your sent forward, tap the trash icon, and choose <strong>"Delete for Everyone"</strong> before more group members open it.
                </p>
              </div>

              {/* Step 2: Post Retraction */}
              <div className="containment-step-card">
                <div className="step-card-num-row">
                  <MessageSquare size={13} />
                  <span>Step 2: Post Counter-Debunk</span>
                </div>
                <h4 className="step-card-title">Share the Correction</h4>
                <p className="step-card-desc">
                  If the recall window expired or recipients already saw it, paste the polite retraction snippet above into every chat where you shared the message.
                </p>
              </div>

              {/* Step 3: Emergency Actions (Context-specific) */}
              <div className="containment-step-card">
                <div className="step-card-num-row">
                  {isFinancialOrPhishing ? <PhoneCall size={13} /> : <ShieldAlert size={13} />}
                  <span>Step 3: {isFinancialOrPhishing ? 'Cyber & Financial Action' : 'Community Safeguard'}</span>
                </div>
                <h4 className="step-card-title">
                  {isFinancialOrPhishing ? 'Report & Freeze Credentials' : (isHealth ? 'Issue Medical Warning' : 'Notify Chat Admins')}
                </h4>
                <div className="step-card-desc">
                  {isFinancialOrPhishing ? (
                    <div>
                      If anyone clicked links or shared OTP/banking details:
                      <ul style={{ margin: '0.35rem 0 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem' }}>
                        <li>Call Cyber Helpline <strong>1930</strong> (India) immediately</li>
                        <li>Freeze UPI/cards in your banking app</li>
                        <li>Lodge complaint at <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-forest)', textDecoration: 'underline' }}>cybercrime.gov.in</a></li>
                      </ul>
                    </div>
                  ) : isHealth ? (
                    <span>
                      Urge contacts not to ingest or administer unverified concoctions, self-medicate, or stop existing prescriptions. Advise consulting a licensed medical practitioner.
                    </span>
                  ) : (
                    <span>
                      Notify group administrators so they can pin the TruthLens debunk or temporarily restrict forwarding permissions to prevent viral chain spread.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action 3: Interactive Containment Checklist */}
            <div className="containment-checklist-box">
              <div className="checklist-title-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LifeBuoy size={15} style={{ color: 'var(--color-forest)' }} />
                  <span>Containment Progress Checklist</span>
                </span>
                <span style={{ fontSize: '0.78rem', color: completedStepsCount === 4 ? 'var(--verdict-supported)' : 'var(--text-muted)' }}>
                  {completedStepsCount} of 4 Completed ({progressPercent}%)
                </span>
              </div>

              <div className="containment-progress-bar-bg">
                <div className="containment-progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>

              <div className="checklist-items">
                <label className={`checklist-item-label ${checklist.deleted ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checklist.deleted}
                    onChange={() => toggleChecklist('deleted')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>1. Recalled or deleted the original forward from chats</span>
                </label>

                <label className={`checklist-item-label ${checklist.retracted ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checklist.retracted}
                    onChange={() => toggleChecklist('retracted')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>2. Posted TruthLens retraction / correction note into the group</span>
                </label>

                <label className={`checklist-item-label ${checklist.warned ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checklist.warned}
                    onChange={() => toggleChecklist('warned')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>3. Warned contacts not to forward further or click external links</span>
                </label>

                <label className={`checklist-item-label ${checklist.secured ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checklist.secured}
                    onChange={() => toggleChecklist('secured')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>4. {isFinancialOrPhishing ? 'Alerted bank / called 1930 helpline if links were clicked' : 'Alerted group admins to pin debunk'}</span>
                </label>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* 3. Fact-Checker Community Feedback Controls */}
      <section className="feedback-rating-card" aria-label="Analysis Feedback">
        <div className="feedback-text-wrap">
          <Info size={18} className="feedback-icon" aria-hidden="true" />
          <div>
            <h4 className="feedback-title">Was this verification helpful and accurate?</h4>
            <p className="feedback-sub">Your feedback directly improves our claim extraction and debunking intelligence.</p>
          </div>
        </div>

        <div className="feedback-actions-row">
          <button
            type="button"
            className={`feedback-choice-btn ${feedback === 'helpful' ? 'chosen-helpful' : ''}`}
            onClick={() => setFeedback('helpful')}
            aria-pressed={feedback === 'helpful'}
          >
            <ThumbsUp size={15} aria-hidden="true" />
            <span>{feedback === 'helpful' ? 'Helpful — Thank you!' : 'Helpful'}</span>
          </button>

          <button
            type="button"
            className={`feedback-choice-btn ${feedback === 'review' ? 'chosen-review' : ''}`}
            onClick={() => setFeedback('review')}
            aria-pressed={feedback === 'review'}
          >
            <ThumbsDown size={15} aria-hidden="true" />
            <span>{feedback === 'review' ? 'Flagged for Review' : 'Needs Review'}</span>
          </button>
        </div>
      </section>

      {/* 4. Report Export & Sharing Actions */}
      <section className="report-export-card" aria-label="Export verification report">
        <div className="export-title-wrap">
          <h4 className="export-heading">Export & Share Report</h4>
          <p className="export-sub">Copy a clean plain-text summary or download the standardized JSON verdict payload.</p>
        </div>

        <div className="export-buttons-group">
          <button
            type="button"
            className="export-btn"
            onClick={onCopySummary}
          >
            {copied ? <Check size={16} color="var(--verdict-supported)" /> : <Copy size={16} />}
            <span>{copied ? 'Summary Copied to Clipboard!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="export-btn"
            onClick={onDownloadJson}
          >
            <Download size={16} />
            <span>Download Verdict JSON</span>
          </button>
        </div>
      </section>
    </div>
  );
}
