import { kbProvider } from './providers/kb.provider.js';
import { googleFactCheckProvider } from './providers/google_factcheck.provider.js';
import { webSearchProvider } from './providers/web_search.provider.js';
import { processEvidenceItems } from './evidence_processor.js';

export class RetrieverService {
  constructor() {
    this.providers = [
      kbProvider,
      googleFactCheckProvider,
      webSearchProvider
    ];
  }

  /**
   * Retrieves evidence from all available sources, reports limitations,
   * deduplicates, and validates quotes against source content.
   * 
   * @param {string} claim - The atomic claim to search
   * @param {Object} options - Retrieval settings
   * @returns {Promise<{
   *   evidence: Array<Object>,
   *   retrieval_metadata: Object
   * }>}
   */
  async retrieveEvidence(claim, options = {}) {
    if (!claim || claim.trim().length === 0) {
      return {
        evidence: [],
        retrieval_metadata: {
          total_retrieved: 0,
          verified_count: 0,
          providers_status: []
        }
      };
    }

    const providerTasks = this.providers.map(async provider => {
      try {
        const response = await provider.retrieve(claim, options);
        return {
          provider: provider.name,
          status: response.status,
          count: response.results ? response.results.length : 0,
          results: response.results || [],
          reason: response.reason || null
        };
      } catch (err) {
        return {
          provider: provider.name,
          status: 'ERROR',
          count: 0,
          results: [],
          reason: err.message
        };
      }
    });

    const results = await Promise.allSettled(providerTasks);

    const candidates = [];
    const providersStatus = [];

    for (const res of results) {
      if (res.status === 'fulfilled') {
        const item = res.value;
        providersStatus.push({
          provider: item.provider,
          status: item.status,
          count: item.count,
          reason: item.reason
        });
        if (item.results && item.results.length > 0) {
          candidates.push(...item.results);
        }
      }
    }

    // Process, deduplicate, rank, and strictly validate quotes against source texts
    const validatedEvidence = processEvidenceItems(candidates, claim, options);

    return {
      evidence: validatedEvidence,
      retrieval_metadata: {
        total_candidates: candidates.length,
        verified_count: validatedEvidence.length,
        providers_status: providersStatus
      }
    };
  }
}

export const retrieverService = new RetrieverService();
