import { BaseProvider } from './base.provider.js';

/**
 * Web Search Provider (Tavily / Serper / Custom)
 * Connects to live web search APIs when keys are configured.
 * Reports provider limitation without simulating or fabricating fake links.
 */
export class WebSearchProvider extends BaseProvider {
  constructor() {
    super('web_search');
  }

  isAvailable() {
    return Boolean(
      process.env.TAVILY_API_KEY ||
      process.env.SERPER_API_KEY ||
      (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX)
    );
  }

  /**
   * Retrieves live web search results.
   * 
   * @param {string} query 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async retrieve(query, options = {}) {
    if (!this.isAvailable()) {
      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        reason: 'Web search provider is disabled: No search API key configured (TAVILY_API_KEY or SERPER_API_KEY)',
        results: []
      };
    }

    const { maxResults = 4 } = options;

    // 1. Check Tavily API
    if (process.env.TAVILY_API_KEY) {
      return await this._searchTavily(query, maxResults);
    }

    // 2. Check Serper API
    if (process.env.SERPER_API_KEY) {
      return await this._searchSerper(query, maxResults);
    }

    return {
      provider: this.name,
      status: 'UNAVAILABLE',
      reason: 'Configured web search provider is unsupported',
      results: []
    };
  }

  async _searchTavily(query, maxResults) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: 'basic',
          include_answer: false,
          max_results: maxResults
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          reason: `Tavily API responded with status ${response.status}`,
          results: []
        };
      }

      const data = await response.json();
      const results = (data.results || []).map(item => ({
        provider: this.name,
        source_name: item.title || new URL(item.url).hostname,
        url: item.url,
        published_date: item.published_date || undefined,
        trust_tier: 'TIER_3_GENERAL_NEWS',
        raw_content: item.content || item.snippet || '',
        excerpt: item.content || item.snippet || '',
        relevance_score: item.score || 0.75,
        domain: new URL(item.url).hostname,
        title: item.title
      }));

      return {
        provider: this.name,
        status: results.length > 0 ? 'SUCCESS' : 'EMPTY',
        results
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        reason: `Tavily search failed: ${err.message}`,
        results: []
      };
    }
  }

  async _searchSerper(query, maxResults) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, num: maxResults })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          reason: `Serper API error: ${response.statusText}`,
          results: []
        };
      }

      const data = await response.json();
      const results = (data.organic || []).map(item => ({
        provider: this.name,
        source_name: item.title || new URL(item.link).hostname,
        url: item.link,
        published_date: item.date || undefined,
        trust_tier: 'TIER_3_GENERAL_NEWS',
        raw_content: item.snippet || '',
        excerpt: item.snippet || '',
        relevance_score: 0.75,
        domain: new URL(item.link).hostname,
        title: item.title
      }));

      return {
        provider: this.name,
        status: results.length > 0 ? 'SUCCESS' : 'EMPTY',
        results
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        reason: `Serper search failed: ${err.message}`,
        results: []
      };
    }
  }
}

export const webSearchProvider = new WebSearchProvider();
