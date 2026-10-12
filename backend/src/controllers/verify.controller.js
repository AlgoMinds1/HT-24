import { validateVerificationRequest } from '../validators/input.validator.js';
import { verificationManager } from '../services/verification_manager.js';
import { executeDualAgentInvestigation } from '../services/dual_agent_orchestrator.js';

/**
 * Unified verification controller handling POST /api/verify for all five input types:
 * text, image, audio, pdf, and url.
 * Supports both real-time SSE streaming (stream=true or Accept: text/event-stream)
 * and traditional synchronous JSON response.
 */
export async function handleVerifyClaim(req, res, next) {
  try {
    // 1. Validate request shape and type
    const validatedRequest = validateVerificationRequest(req);

    const isStreaming = 
      req.query.stream === 'true' || 
      (req.headers['accept'] && req.headers['accept'].includes('text/event-stream'));

    const session = verificationManager.createSession();
    const skipCache = req.query.fresh === 'true' || req.headers['x-skip-cache'] === 'true';

    if (isStreaming) {
      // Connect client to SSE stream
      session.addSubscriber(res);

      // Execute investigation in background and let events stream to client
      executeDualAgentInvestigation(validatedRequest, session, { skipCache })
        .catch(err => {
          console.warn(`[VerifyController] Investigation error for ${session.id}:`, err.message);
        })
        .finally(() => {
          setTimeout(() => {
            session.close();
          }, 600);
        });

      return;
    }

    // Synchronous execution for legacy callers/tests:
    // Run investigation, collect final verdict, and return 200 JSON
    const verdict = await executeDualAgentInvestigation(validatedRequest, session, { skipCache });
    session.close();

    if (res.headersSent) return;
    return res.status(200).json(verdict);

  } catch (err) {
    if (res.headersSent) return;
    next(err);
  }
}

/**
 * GET /api/verify/stream/:id
 * Connects or reconnects to an ongoing or completed investigation session via SSE.
 */
export function handleStreamById(req, res) {
  const { id } = req.params;
  const session = verificationManager.getSession(id);

  if (!session) {
    return res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: `Verification session ${id} not found or expired.` } });
  }

  const lastSeq = parseInt(req.headers['last-event-id'] || req.query.lastSeq || '0', 10);
  session.addSubscriber(res, isNaN(lastSeq) ? 0 : lastSeq);
}

/**
 * POST /api/verify/abort/:id
 * Cancels a live investigation session in the backend.
 */
export function handleAbortVerification(req, res) {
  const { id } = req.params;
  const aborted = verificationManager.abortSession(id, 'Verification aborted by user.');

  if (aborted) {
    return res.status(200).json({ success: true, aborted: true, verificationId: id });
  }
  return res.status(404).json({ success: false, message: `Session ${id} not found or already finished.` });
}
