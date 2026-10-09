/**
 * Base Retrieval Provider Interface
 * All retrieval sources (KB, Google Fact Check, Web Search) implement this contract.
 */
export class BaseProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Checks whether credentials and requirements are met to invoke the provider.
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('isAvailable() must be implemented by subclass');
  }

  /**
   * Retrieves candidate evidence items for a given query string.
   * 
   * @param {string} query - Atomic claim or forward text
   * @param {Object} options - Retrieval options (topK, timeout, etc.)
   * @returns {Promise<{
   *   provider: string,
   *   status: 'SUCCESS' | 'UNAVAILABLE' | 'EMPTY' | 'ERROR',
   *   results: Array<Object>,
   *   reason?: string
   * }>}
   */
  async retrieve(query, options = {}) {
    throw new Error('retrieve() must be implemented by subclass');
  }
}
