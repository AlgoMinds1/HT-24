import { BaseProvider } from './base.provider.js';
import { env } from '../../config/env.js';

/**
 * Google Fact Check Tools claims:search Provider
 * Queries official Fact Check Tools API when credentials and quota permit.
 * Never simulates mock results when unavailable.
 */
export class GoogleFactCheckProvider extends BaseProvider {
  constructor() {
    super('google_factcheck');
  }

  getApiKey() {
    return process.env.GOOGLE_FACTCHECK_API_KEY || (env.hasGeminiKey ? env.GEMINI_API_KEY : null);
  }

  isAvailable() {
    return Boolean(this.getApiKey());
  }

  /**
   * Retrieves verified claim reviews from Google Fact Check Tools API.
   * 
   * @param {string} query 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async retrieve(query, options = {}) {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        reason: 'GOOGLE_FACTCHECK_API_KEY not configured in environment',
        results: []
      };
    }

    const { pageSize = 5, languageCode = 'en' } = options;
    const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&languageCode=${languageCode}&key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errBody = await response.json();
          if (errBody.error?.message) {
            errMessage = errBody.error.message;
          }
        } catch {}

        return {
          provider: this.name,
          status: 'UNAVAILABLE',
          reason: `Google Fact Check Tools API error: ${errMessage}`,
          results: []
        };
      }

      const data = await response.json();
      const claims = data.claims || [];

      if (claims.length === 0) {
        return {
          provider: this.name,
          status: 'EMPTY',
          reason: 'No matching claims found in Google Fact Check database',
          results: []
        };
      }

      const results = [];
      for (const item of claims) {
        for (const review of (item.claimReview || [])) {
          const publisherName = review.publisher?.name || 'Verified Fact Checker';
          const reviewUrl = review.url;
          if (!reviewUrl) continue;

          const title = review.title || item.text || 'Fact Check Review';
          const textualRating = review.textualRating || 'Evaluated';
          const excerptText = `${title}. Verdict rating by ${publisherName}: "${textualRating}".`;

          results.push({
            provider: this.name,
            source_name: publisherName,
            url: reviewUrl,
            published_date: review.reviewDate ? review.reviewDate.split('T')[0] : (item.claimDate ? item.claimDate.split('T')[0] : undefined),
            trust_tier: 'TIER_2_FACT_CHECKER',
            raw_content: excerptText,
            excerpt: excerptText,
            relevance_score: 0.88,
            domain: review.publisher?.site || 'factchecktools.googleapis.com',
            title: title,
            metadata: {
              textualRating,
              originalClaim: item.text,
              claimant: item.claimant
            }
          });
        }
      }

      return {
        provider: this.name,
        status: results.length > 0 ? 'SUCCESS' : 'EMPTY',
        results
      };

    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      return {
        provider: this.name,
        status: 'UNAVAILABLE',
        reason: isTimeout ? 'Google Fact Check request timed out (8s)' : `Network error: ${err.message}`,
        results: []
      };
    }
  }
}

export const googleFactCheckProvider = new GoogleFactCheckProvider();
