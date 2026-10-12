import * as cheerio from 'cheerio';
import { ingestInput } from '../ingest/index.js';
import { fetchLiveNews, fetchFactChecks } from './live_news_retriever.js';
import { isOfficialWebsite } from '../utils/official_sources.js';
import { validateHostForSsrf } from '../ingest/url.ingest.js';
import { verifyClaimWithAI } from './ai_verifier.js';
import { verificationCache, VerificationCache } from '../utils/cache.js';
import { env } from '../config/env.js';

/**
 * Safely fetches a candidate web page to extract real text evidence.
 * Includes SSRF protections, timeout, and max download limit.
 */
async function fetchPageEvidence(targetUrl, signal) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { success: false, reason: 'Unsupported protocol', httpStatus: 400 };
    }

    // SSRF protection
    await validateHostForSsrf(parsed.hostname);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    // Merge session signal with timeout signal
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TruthLensBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9'
      }
    });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (!response.ok) {
      return {
        success: false,
        httpStatus: response.status,
        reason: response.status === 403 ? 'Blocked by site anti-scraping / 403 Forbidden' : `HTTP error ${response.status}`
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { success: false, reason: 'Non-HTML content type', httpStatus: 200 };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise scripts, styles, headers, footers
    $('script, style, noscript, nav, header, footer, svg, iframe').remove();

    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || parsed.hostname;
    
    // Extract main readable paragraphs
    const paragraphs = [];
    $('article p, main p, .article-body p, .content p, p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 40 && !text.includes('cookie') && !text.includes('subscribe')) {
        paragraphs.push(text);
      }
    });

    const bodyText = paragraphs.slice(0, 10).join(' ') || $('body').text().replace(/\s+/g, ' ').trim();
    const excerpt = bodyText.slice(0, 400).trim();

    return {
      success: true,
      httpStatus: response.status,
      title: pageTitle,
      excerpt: excerpt || 'Page content retrieved successfully.',
      domain: parsed.hostname
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, reason: 'Request timed out or aborted', httpStatus: 408 };
    }
    return { success: false, reason: err.message, httpStatus: 500 };
  }
}

/**
 * Orchestrates the full live verification pipeline for a session with fine-grained real-time events.
 * 
 * @param {Object} validatedRequest - Request validated by input.validator
 * @param {import('./verification_manager.js').VerificationSession} session - Active verification session
 * @param {Object} [options]
 * @returns {Promise<Object>} Final verdict payload
 */
export async function executeDualAgentInvestigation(validatedRequest, session, options = {}) {
  const signal = session.signal;

  try {
    session.emit({
      agent: 'system',
      eventType: 'verification_started',
      status: 'in_progress',
      message: `Verification session initialized for input type: ${validatedRequest.inputType}`
    });

    // 1. Ingest input & extract claim
    const ingestionResult = await ingestInput(validatedRequest);
    if (signal.aborted) return;

    session.emit({
      agent: 'system',
      eventType: 'input_validated',
      status: 'completed',
      message: `Input verified as ${validatedRequest.inputType}. Format validation passed.`
    });

    // If Image, emit metadata & EXIF forensics event
    if (validatedRequest.inputType === 'image' && ingestionResult.extraction) {
      const exif = ingestionResult.extraction.exifAnalysis;
      session.emit({
        agent: 'system',
        eventType: 'metadata_extracted',
        status: 'completed',
        data: {
          hasExif: Boolean(exif?.hasExif),
          manipulationRisk: exif?.manipulationRisk || 'LOW',
          signals: exif?.signals || [],
          fileName: ingestionResult.extraction.fileName,
          fileSizeBytes: ingestionResult.extraction.fileSizeBytes,
          readability: ingestionResult.extraction.readability
        },
        message: exif?.hasExif 
          ? `EXIF metadata captured: ${exif.signals?.length || 0} hardware/timestamp signals analyzed.`
          : 'Image binary inspected. Standard EXIF headers stripped or not present.'
      });
    }

    const claimText = ingestionResult.claim?.text;
    if (!claimText || claimText.length < 5) {
      session.emit({
        agent: 'system',
        eventType: 'verification_failed',
        status: 'failed',
        error: 'Unable to extract a clear factual claim from the submitted content.'
      });
      throw new Error('Unable to extract a clear factual claim from the submitted content.');
    }

    session.emit({
      agent: 'system',
      eventType: 'claim_extracted',
      status: 'completed',
      data: {
        claimText,
        language: ingestionResult.claim.language || 'en',
        entities: ingestionResult.claim.entities || [],
        dateHint: ingestionResult.claim.dateHint || null
      },
      message: `Extracted normalized factual claim: "${claimText}"`
    });

    // Check cache if not fresh
    const skipCache = options.skipCache || false;
    let cacheKey = null;
    if (!skipCache) {
      if (validatedRequest.inputType === 'text') {
        cacheKey = `text:${VerificationCache.hashKey(claimText)}`;
      } else if (validatedRequest.inputType === 'url') {
        cacheKey = `url:${VerificationCache.hashKey(validatedRequest.url)}`;
      }
      if (cacheKey) {
        const cached = verificationCache.get(cacheKey);
        if (cached) {
          session.emit({
            agent: 'system',
            eventType: 'verification_completed',
            status: 'completed',
            data: { ...cached, cached: true, cache_hit: true },
            message: 'Deterministic verification replay retrieved from in-memory cache.'
          });
          return cached;
        }
      }
    }

    // --------------------------------------------------------------------------
    // DUAL-AGENT CONCURRENT EXECUTION
    // Agent 1: Web Research Agent (Google News RSS + Page Fetching)
    // Agent 2: Fact-Check Agent (Google Fact Check Tools API)
    // --------------------------------------------------------------------------

    const agent1Promise = (async () => {
      session.emit({
        agent: 'web_research',
        eventType: 'search_started',
        status: 'in_progress',
        query: claimText,
        provider: 'Google News RSS / Real-time Web Search',
        message: `Agent 1 searching authoritative sources and real-time news for: "${claimText}"`
      });

      let newsArticles = [];
      try {
        newsArticles = await fetchLiveNews(claimText);
        if (signal.aborted) return [];

        session.emit({
          agent: 'web_research',
          eventType: 'search_completed',
          status: 'completed',
          query: claimText,
          provider: 'Google News RSS',
          data: {
            resultCount: newsArticles.length,
            articles: newsArticles.map(a => ({ title: a.title, url: a.url, source: a.source_name, is_official: a.is_official }))
          },
          message: `Agent 1 retrieved ${newsArticles.length} candidate news & official domain results.`
        });
      } catch (err) {
        session.emit({
          agent: 'web_research',
          eventType: 'search_completed',
          status: 'failed',
          error: err.message,
          message: `Agent 1 web search encountered an issue: ${err.message}`
        });
        return [];
      }

      // Fetch and inspect top candidate pages (up to 3)
      const verifiedWebEvidence = [];
      const topCandidates = newsArticles.slice(0, 3);

      for (const item of topCandidates) {
        if (signal.aborted) break;

        session.emit({
          agent: 'web_research',
          eventType: 'url_selected',
          status: 'in_progress',
          url: item.url,
          title: item.title,
          domain: new URL(item.url).hostname,
          message: `Selected candidate source for inspection: ${item.source_name}`
        });

        session.emit({
          agent: 'web_research',
          eventType: 'page_fetch_started',
          status: 'in_progress',
          url: item.url,
          domain: new URL(item.url).hostname,
          message: `Fetching and parsing live webpage content: ${item.url}`
        });

        const fetchResult = await fetchPageEvidence(item.url, signal);

        if (fetchResult.success) {
          const excerptText = fetchResult.excerpt || item.snippet || item.title;
          const isOfficial = isOfficialWebsite(item.url) || item.is_official;

          session.emit({
            agent: 'web_research',
            eventType: 'page_fetch_completed',
            status: 'completed',
            url: item.url,
            title: fetchResult.title || item.title,
            domain: fetchResult.domain,
            publishedDate: item.published_date,
            httpStatus: fetchResult.httpStatus,
            excerpt: excerptText,
            message: `Successfully inspected page: "${fetchResult.title || item.title}" (${fetchResult.domain})`
          });

          session.emit({
            agent: 'web_research',
            eventType: 'evidence_extracted',
            status: 'completed',
            url: item.url,
            title: fetchResult.title || item.title,
            domain: fetchResult.domain,
            publishedDate: item.published_date,
            excerpt: excerptText,
            stance: 'CONTEXTUALIZES',
            classificationType: 'direct_evidence',
            message: `Extracted verified evidence excerpt from ${item.source_name}`
          });

          verifiedWebEvidence.push({
            source_name: item.source_name,
            url: item.url,
            published_date: item.published_date,
            title: fetchResult.title || item.title,
            excerpt: excerptText,
            is_official: isOfficial,
            retrieved_by: 'Agent 1 (Web Research)'
          });
        } else {
          session.emit({
            agent: 'web_research',
            eventType: 'page_fetch_failed',
            status: 'blocked',
            url: item.url,
            domain: new URL(item.url).hostname,
            httpStatus: fetchResult.httpStatus,
            error: fetchResult.reason,
            message: `Page fetch failed or blocked (${fetchResult.httpStatus || 'N/A'}): ${fetchResult.reason}`
          });

          // Still preserve the search result snippet if available
          if (item.snippet) {
            verifiedWebEvidence.push({
              source_name: item.source_name,
              url: item.url,
              published_date: item.published_date,
              title: item.title,
              excerpt: item.snippet,
              is_official: item.is_official,
              retrieved_by: 'Agent 1 (Web Search Snippet)'
            });
          }
        }
      }

      return verifiedWebEvidence;
    })();

    const agent2Promise = (async () => {
      session.emit({
        agent: 'fact_check',
        eventType: 'fact_check_started',
        status: 'in_progress',
        query: claimText,
        provider: 'Google Fact Check Tools API',
        message: `Agent 2 querying Google Fact Check database for verified reviews: "${claimText}"`
      });

      const factCheckKey = env.GOOGLE_FACTCHECK_API_KEY || env.GEMINI_API_KEY;
      if (!factCheckKey) {
        session.emit({
          agent: 'fact_check',
          eventType: 'fact_check_failed',
          status: 'failed',
          error: 'GOOGLE_FACTCHECK_API_KEY not configured in environment',
          message: 'Google Fact Check Tools API is unavailable: API key not set.'
        });
        return [];
      }

      try {
        const factChecks = await fetchFactChecks(claimText);
        if (signal.aborted) return [];

        if (factChecks.length === 0) {
          session.emit({
            agent: 'fact_check',
            eventType: 'fact_check_empty',
            status: 'empty',
            message: 'No matching records in Google Fact Check database. (Absence of fact-checks does not confirm or refute the claim).'
          });
          return [];
        }

        session.emit({
          agent: 'fact_check',
          eventType: 'fact_check_matches',
          status: 'completed',
          data: {
            matchCount: factChecks.length,
            records: factChecks.map(fc => ({
              publisher: fc.source_name,
              title: fc.title,
              url: fc.url,
              rating: fc.textual_rating,
              stance: fc.stance,
              date: fc.published_date
            }))
          },
          message: `Agent 2 found ${factChecks.length} matching certified fact-check records.`
        });

        for (const fc of factChecks) {
          session.emit({
            agent: 'fact_check',
            eventType: 'evidence_extracted',
            status: 'completed',
            url: fc.url,
            title: fc.title,
            domain: new URL(fc.url).hostname,
            publishedDate: fc.published_date,
            excerpt: fc.snippet,
            stance: fc.stance,
            classificationType: 'direct_evidence',
            message: `Fact-Check: Rated "${fc.textual_rating}" by ${fc.source_name}`
          });
        }

        return factChecks.map(fc => ({
          ...fc,
          retrieved_by: 'Agent 2 (Fact-Check Tools)'
        }));
      } catch (err) {
        session.emit({
          agent: 'fact_check',
          eventType: 'fact_check_failed',
          status: 'failed',
          error: err.message,
          message: `Fact Check API query error: ${err.message}`
        });
        return [];
      }
    })();

    // Await both agents concurrently
    const [webEvidence, factCheckEvidence] = await Promise.all([agent1Promise, agent2Promise]);
    if (signal.aborted) return;

    // --------------------------------------------------------------------------
    // EVIDENCE COMPARISON & SYNTHESIS
    // --------------------------------------------------------------------------
    session.emit({
      agent: 'synthesis',
      eventType: 'evidence_comparison_started',
      status: 'in_progress',
      message: 'Comparing findings from Agent 1 (Web Research) and Agent 2 (Fact-Check API)...'
    });

    const combinedEvidence = [...(factCheckEvidence || []), ...(webEvidence || [])];
    
    // Deduplicate
    const seenUrls = new Set();
    const deduplicatedEvidence = [];
    for (const ev of combinedEvidence) {
      const u = (ev.url || '').toLowerCase();
      if (u && !seenUrls.has(u)) {
        seenUrls.add(u);
        deduplicatedEvidence.push(ev);
      }
    }

    session.emit({
      agent: 'synthesis',
      eventType: 'evidence_comparison_completed',
      status: 'completed',
      data: {
        totalEvidenceItems: deduplicatedEvidence.length,
        fromAgent1Count: webEvidence?.length || 0,
        fromAgent2Count: factCheckEvidence?.length || 0
      },
      message: `Evidence synthesized: ${deduplicatedEvidence.length} distinct sources cross-referenced.`
    });

    // Generate Final Verdict with AI
    session.emit({
      agent: 'synthesis',
      eventType: 'verdict_generated',
      status: 'in_progress',
      message: 'Synthesizing evidence-grounded determination, confidence score, and action-risk assessment...'
    });

    const verdictPayload = await verifyClaimWithAI(claimText, {
      inputType: ingestionResult.inputType,
      sourcePlatform: ingestionResult.extraction?.sourceUrl || ingestionResult.extraction?.fileName || 'Dual-Agent Forward',
      extraction: {
        ...ingestionResult.extraction,
        factCheckResults: factCheckEvidence,
        liveWebResults: webEvidence
      }
    });

    if (signal.aborted) return;

    verdictPayload.id = session.id;
    verdictPayload.verificationId = session.id;
    verdictPayload.mode = 'live';
    verdictPayload.cached = false;
    verdictPayload.input = {
      raw_text: claimText,
      media_type: ingestionResult.inputType,
      received_at: new Date().toISOString(),
      source_platform: ingestionResult.extraction?.sourceUrl || ingestionResult.extraction?.fileName || 'Multimodal Forward'
    };
    verdictPayload.extraction = ingestionResult.extraction;
    verdictPayload.retrieval_metadata = {
      agent1_web_count: webEvidence?.length || 0,
      agent2_factcheck_count: factCheckEvidence?.length || 0,
      total_grounded_evidence: deduplicatedEvidence.length
    };

    if (cacheKey) {
      verificationCache.set(cacheKey, verdictPayload);
    }

    session.emit({
      agent: 'synthesis',
      eventType: 'verification_completed',
      status: 'completed',
      data: verdictPayload,
      message: `Verification complete: [${verdictPayload.verdict}] Determination established.`
    });

    return verdictPayload;

  } catch (err) {
    if (signal.aborted) return;
    session.emit({
      agent: 'system',
      eventType: 'verification_failed',
      status: 'failed',
      error: err.message,
      message: `Verification halted: ${err.message}`
    });
    throw err;
  }
}
