import crypto from 'crypto';

/**
 * @typedef {Object} VerificationEvent
 * @property {string} verificationId
 * @property {'system' | 'web_research' | 'fact_check' | 'synthesis'} agent
 * @property {string} eventType
 * @property {'in_progress' | 'completed' | 'failed' | 'empty' | 'blocked'} status
 * @property {string} timestamp
 * @property {number} [seq]
 * @property {string} [query]
 * @property {string} [provider]
 * @property {string} [url]
 * @property {string} [title]
 * @property {string} [domain]
 * @property {string} [publishedDate]
 * @property {number} [httpStatus]
 * @property {string} [excerpt]
 * @property {'SUPPORTS' | 'REFUTES' | 'CONTEXTUALIZES'} [stance]
 * @property {'direct_evidence' | 'ai_interpretation'} [classificationType]
 * @property {string} [message]
 * @property {string} [error]
 * @property {any} [data]
 */

class VerificationSession {
  constructor(id) {
    this.id = id;
    this.createdAt = Date.now();
    this.abortController = new AbortController();
    this.events = [];
    this.seq = 0;
    this.subscribers = new Set();
    this.isCompleted = false;
    this.isAborted = false;
    this.result = null;
    this.keepAliveInterval = null;
  }

  get signal() {
    return this.abortController.signal;
  }

  emit(eventData) {
    if (this.isAborted) return;

    this.seq += 1;
    const event = {
      verificationId: this.id,
      seq: this.seq,
      timestamp: new Date().toISOString(),
      ...eventData
    };

    this.events.push(event);
    if (this.events.length > 100) {
      this.events.shift(); // retain last 100 events
    }

    if (event.eventType === 'verification_completed') {
      this.isCompleted = true;
      this.result = event.data;
    } else if (event.eventType === 'verification_aborted') {
      this.isAborted = true;
    }

    const sseFormatted = `event: message\ndata: ${JSON.stringify(event)}\n\n`;

    for (const res of this.subscribers) {
      try {
        res.write(sseFormatted);
        if (typeof res.flush === 'function') res.flush();
      } catch (err) {
        console.warn(`[VerificationManager] Failed to write event to subscriber for ${this.id}:`, err.message);
        this.subscribers.delete(res);
      }
    }
  }

  addSubscriber(res, lastEventSeq = 0) {
    // Flush any headers if not flushed
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Replay past events since lastEventSeq
    const replayEvents = this.events.filter(e => e.seq > lastEventSeq);
    for (const ev of replayEvents) {
      res.write(`event: message\ndata: ${JSON.stringify(ev)}\n\n`);
    }
    if (typeof res.flush === 'function') res.flush();

    this.subscribers.add(res);

    // Keepalive heartbeat every 15s to prevent Render or CDN idle drop
    if (!this.keepAliveInterval) {
      this.keepAliveInterval = setInterval(() => {
        if (this.subscribers.size === 0) return;
        for (const sub of this.subscribers) {
          try {
            sub.write(': keepalive\n\n');
            if (typeof sub.flush === 'function') sub.flush();
          } catch {
            this.subscribers.delete(sub);
          }
        }
      }, 15000);
    }

    res.on('close', () => {
      this.subscribers.delete(res);
      if (this.subscribers.size === 0 && this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
    });
  }

  abort(reason = 'Verification aborted by user') {
    if (this.isAborted || this.isCompleted) return;

    this.emit({
      agent: 'system',
      eventType: 'verification_aborted',
      status: 'failed',
      message: reason
    });

    this.isAborted = true;
    this.abortController.abort();

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    for (const res of this.subscribers) {
      try {
        res.end();
      } catch {}
    }
    this.subscribers.clear();
  }

  close() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    for (const res of this.subscribers) {
      try {
        res.end();
      } catch {}
    }
    this.subscribers.clear();
  }
}

class VerificationManager {
  constructor() {
    /** @type {Map<string, VerificationSession>} */
    this.sessions = new Map();

    // Periodic cleanup of stale sessions older than 15 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions.entries()) {
        if (now - session.createdAt > 15 * 60 * 1000) {
          session.close();
          this.sessions.delete(id);
        }
      }
    }, 60 * 1000);
  }

  createSession() {
    const id = `verif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const session = new VerificationSession(id);
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  abortSession(id, reason) {
    const session = this.sessions.get(id);
    if (session) {
      session.abort(reason);
      return true;
    }
    return false;
  }
}

export const verificationManager = new VerificationManager();
