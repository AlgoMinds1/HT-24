/**
 * TruthLens History Storage Utility
 * Manages client-side persistence of completed verifications via LocalStorage.
 */

const STORAGE_KEY = 'truthlens_verification_history';
const MAX_HISTORY_ITEMS = 30;

/**
 * Loads all saved verification reports from LocalStorage.
 * @returns {Array<Object>} List of saved verification records
 */
export function getSavedVerifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[HistoryStorage] Failed to read history from LocalStorage:', err);
    return [];
  }
}

/**
 * Saves a new verification result to the history list.
 * @param {Object} report - Complete normalized verdict contract payload
 * @param {string} [modality='text'] - Input modality (text, image, audio, pdf, url)
 * @returns {Array<Object>} Updated history list
 */
export function saveVerificationToHistory(report, modality = 'text') {
  if (!report) return getSavedVerifications();

  try {
    const history = getSavedVerifications();
    const id = report.id || `tl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    // Create a compact record for listing and keep the full report for detail view
    const record = {
      id,
      timestamp: report.input?.received_at || new Date().toISOString(),
      modality: report.input?.media_type || modality || 'text',
      claim: report.input?.extractedClaim || report.claim?.text || report.input?.raw_text || 'Unspecified Claim',
      verdictStatus: report.verdict?.status || 'UNCONFIRMED',
      verdictLabel: report.verdict?.label || 'Cannot Confirm',
      confidenceScore: report.verdict?.confidence ?? null,
      confidenceRating: report.verdict?.rating ?? null,
      riskLevel: report.actionRisk?.level || 'UNKNOWN',
      summary: report.verdict?.explanation || '',
      fullReport: report
    };

    // Prepend new record, deduplicate by ID, cap at maximum items
    const filtered = history.filter(item => item.id !== id);
    const updated = [record, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[HistoryStorage] Failed to save verification to LocalStorage:', err);
    return getSavedVerifications();
  }
}

/**
 * Removes a specific verification by ID.
 * @param {string} id
 * @returns {Array<Object>}
 */
export function removeVerificationFromHistory(id) {
  try {
    const history = getSavedVerifications();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[HistoryStorage] Failed to remove item:', err);
    return getSavedVerifications();
  }
}

/**
 * Clears all verification history.
 */
export function clearAllHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  } catch (err) {
    console.warn('[HistoryStorage] Failed to clear history:', err);
    return [];
  }
}
