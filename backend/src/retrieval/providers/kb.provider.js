import { BaseProvider } from './base.provider.js';
import { vectorStore } from '../vector_store.js';

/**
 * Curated Knowledge Base Provider
 * Retrieves verified passages from local persisted vector store and KB documents.
 */
export class KBProvider extends BaseProvider {
  constructor() {
    super('curated_kb');
  }

  isAvailable() {
    return true; // Always available locally
  }

  /**
   * Retrieves matching evidence chunks from the local KB.
   * 
   * @param {string} query 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async retrieve(query, options = {}) {
    const { topK = 4, minScore = 0.20 } = options;

    try {
      const hits = await vectorStore.search(query, { topK, minScore });

      if (!hits || hits.length === 0) {
        return {
          provider: this.name,
          status: 'EMPTY',
          results: [],
          reason: 'No matching records in curated knowledge base'
        };
      }

      const results = hits.map(hit => ({
        provider: this.name,
        source_name: hit.source_name,
        url: hit.url,
        published_date: hit.published_date,
        trust_tier: hit.trust_tier,
        raw_content: hit.text,
        excerpt: hit.text,
        relevance_score: hit.score,
        domain: hit.domain,
        title: hit.title,
        metadata: {
          chunkId: hit.id,
          docId: hit.docId,
          similarityType: hit.similarityType
        }
      }));

      return {
        provider: this.name,
        status: 'SUCCESS',
        results
      };
    } catch (err) {
      console.error(`[KBProvider] Search error: ${err.message}`);
      return {
        provider: this.name,
        status: 'ERROR',
        results: [],
        reason: err.message
      };
    }
  }
}

export const kbProvider = new KBProvider();
