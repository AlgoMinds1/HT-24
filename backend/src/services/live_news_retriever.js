import * as cheerio from 'cheerio';
import { isOfficialWebsite } from '../utils/official_sources.js';

const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search';

/**
 * Normalizes query string for news search:
 * Strips forward boilerplate ("Forwarded as received", "Urgent notice", emojis, etc.)
 */
function cleanQueryForSearch(rawText) {
  if (!rawText) return '';
  let text = rawText
    .replace(/^fwd:?/i, '')
    .replace(/^forwarded as received:?/i, '')
    .replace(/^breaking news:?/i, '')
    .replace(/^urgent:?/i, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, ' ')
    .trim();

  // If text is very long, keep first 120 characters or first sentence
  if (text.length > 120) {
    const firstSentence = text.split(/[.\n!?]/)[0];
    if (firstSentence && firstSentence.length >= 10) {
      text = firstSentence;
    } else {
      text = text.slice(0, 120);
    }
  }

  return text.trim();
}

/**
 * Fetches real-time live news articles and fact-check bulletins from Google News RSS.
 * No API key required, zero quota limits, ultra-fast (<800ms).
 * 
 * @param {string} query
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchLiveNews(query, options = {}) {
  const cleaned = cleanQueryForSearch(query);
  if (!cleaned || cleaned.length < 3) {
    return [];
  }

  const { maxResults = 8, region = 'IN', lang = 'en' } = options;
  const searchUrl = `${GOOGLE_NEWS_RSS_URL}?q=${encodeURIComponent(cleaned)}&hl=${lang}-${region}&gl=${region}&ceid=${region}:${lang}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[LiveNews] Google News RSS returned HTTP ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const articles = [];

    $('item').slice(0, maxResults).each((_, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();
      const sourceEl = $(el).find('source');
      const sourceName = sourceEl.text().trim() || 'News Publication';
      const sourceUrl = sourceEl.attr('url') || link;
      const descriptionHtml = $(el).find('description').text();
      
      // Extract clean text from description HTML
      const desc$ = cheerio.load(descriptionHtml);
      const snippet = desc$('body').text().trim() || title;

      if (title && link) {
        articles.push({
          title,
          url: sourceUrl.startsWith('http') ? sourceUrl : link,
          article_link: link,
          source_name: sourceName,
          published_date: pubDate,
          snippet: snippet.length > 250 ? `${snippet.slice(0, 247)}...` : snippet,
          is_official: isOfficialWebsite(sourceUrl) || sourceUrl.includes('.gov')
        });
      }
    });

    return articles;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[LiveNews] Failed to fetch live news for "${cleaned}": ${err.message}`);
    return [];
  }
}
