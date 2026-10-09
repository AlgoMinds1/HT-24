import React from 'react';
import { 
  History, 
  Calendar, 
  Clock, 
  Milestone,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { VERDICT_LABELS } from '../../contracts/verdictContract';

/**
 * TruthTimeline Component
 * 
 * Truth-at-Time Engine: Chronological evolution showing how a claim's validity,
 * official announcements, or debunking records changed across time.
 * 
 * @param {Object} props
 * @param {Array} props.truthTimeline - Array of TruthTimelineEvent items from VerdictContract
 */
export default function TruthTimeline({ truthTimeline = [] }) {
  const safeEvents = Array.isArray(truthTimeline) ? truthTimeline : [];

  if (safeEvents.length === 0) {
    return (
      <section className="timeline-section-card empty" aria-label="Truth Timeline">
        <div className="section-title-wrap">
          <History size={18} className="accent-icon" aria-hidden="true" />
          <h3 className="section-heading">Truth-at-Time History</h3>
        </div>
        <p className="timeline-empty-text">
          No historical claim evolution milestones recorded for this topic.
        </p>
      </section>
    );
  }

  const getHistoricalStatusBadge = (status) => {
    if (!status) return null;
    const label = VERDICT_LABELS[status] || status;
    return <span className={`timeline-status-tag status-${status.toLowerCase()}`}>{label}</span>;
  };

  return (
    <section className="timeline-section-card" aria-label="Truth Timeline">
      <div className="timeline-section-header">
        <div className="section-title-wrap">
          <History size={18} className="accent-icon" aria-hidden="true" />
          <h3 className="section-heading">
            Truth-at-Time Engine: Historical Evolution ({safeEvents.length} Milestones)
          </h3>
        </div>
        <span className="timeline-descriptor-tag">Chronological Record</span>
      </div>

      <div className="timeline-track">
        {safeEvents.map((event, idx) => (
          <div key={event.id || idx} className="timeline-node">
            {/* Timeline Node Marker */}
            <div className="timeline-marker-column">
              <div className="timeline-bullet-dot">
                <span className="timeline-inner-pip" />
              </div>
              {idx < safeEvents.length - 1 && <div className="timeline-connector-stem" />}
            </div>

            {/* Timeline Event Details */}
            <div className="timeline-node-card">
              <div className="timeline-node-top">
                <div className="timeline-date-chip">
                  <Calendar size={13} aria-hidden="true" />
                  <span>{event.date || 'Historical Record'}</span>
                </div>
                {getHistoricalStatusBadge(event.status)}
              </div>

              {event.explanation && (
                <p className="timeline-event-description">
                  {event.explanation}
                </p>
              )}

              {event.impact && (
                <div className="timeline-significance-callout">
                  <span className="significance-title">Factual Impact:</span>
                  <span className="significance-text">{event.impact}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
