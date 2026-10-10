import dns from 'dns';
import { createIngestionResult } from './claim-contract.js';
import { ApiError } from '../utils/api-error.js';
import * as cheerio from 'cheerio';

const MAX_PAGE_SIZE = 2 * 1024 * 1024; // 2MB
const FETCH_TIMEOUT_MS = 10000; // 10s

/**
 * Checks whether an IPv4 or IPv6 address is private, loopback, link-local, or metadata.
 * 
 * @param {string} ip
 * @returns {boolean} True if address is forbidden/internal
 */
export function isPrivateOrReservedIp(ip) {
  if (!ip) return true;

  // IPv6 checks
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    // Loopback / unspecified
    if (lower === '::1' || lower === '::' || lower === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
    // Link-local (fe80::/10)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    // Unique local address (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // IPv4-mapped loopback/private (::ffff:127.0.0.1, etc.)
    if (lower.startsWith('::ffff:')) {
      const ipv4Part = ip.slice(7);
      return isPrivateOrReservedIp(ipv4Part);
    }
    // Documentation / discard
    if (lower.startsWith('2001:db8:') || lower.startsWith('0100::')) return true;

    // Standard public unicast IPv6 addresses (e.g. 2603:..., 2400:..., 2a00:...) are safe
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.').map(n => parseInt(n, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Broadcast/this host)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Resolves a hostname via DNS and verifies it does not map to a private/reserved IP.
 * 
 * @param {string} hostname
 * @returns {Promise<{ resolvedIp: string|null, isResolvable: boolean, dnsError?: string }>} Safe IP info
 */
export async function validateHostForSsrf(hostname) {
  // If hostname is directly an IP or localhost
  if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.local')) {
    throw ApiError.badRequest('Access to local hostnames is strictly forbidden by SSRF security policy.', 'SSRF_BLOCKED');
  }

  try {
    const lookupResult = await dns.promises.lookup(hostname);
    const resolvedIp = lookupResult.address;

    if (isPrivateOrReservedIp(resolvedIp)) {
      throw ApiError.badRequest(`Destination host resolves to internal/private IP (${resolvedIp}), which is forbidden by SSRF policy.`, 'SSRF_BLOCKED');
    }

    return { resolvedIp, isResolvable: true };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Host is an external name that cannot be resolved in DNS (e.g. ENOTFOUND, NXDOMAIN, fake/taken-down domain)
    return { resolvedIp: null, isResolvable: false, dnsError: err.message };
  }
}

/**
 * Safely fetches a web page and extracts article text, protecting against SSRF and oversized payloads.
 * 
 * @param {string} rawUrl
 * @returns {Promise<import('./claim-contract.js').IngestionResult>}
 */
export async function ingestUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw ApiError.badRequest('Please provide a valid web URL.', 'MISSING_URL');
  }

  let parsedUrl = null;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    throw ApiError.badRequest('Invalid URL format. Please provide a full URL including protocol (e.g. https://example.com).', 'INVALID_URL');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw ApiError.badRequest(`Unsupported protocol "${parsedUrl.protocol}". Only http: and https: web URLs are allowed.`, 'UNSUPPORTED_PROTOCOL');
  }

  // SSRF DNS Verification
  const hostCheck = await validateHostForSsrf(parsedUrl.hostname);

  // If host cannot be resolved, ingest it as a suspicious unresolvable destination rather than throwing 400
  if (!hostCheck.isResolvable) {
    const domainName = parsedUrl.hostname;
    const isSuspiciousScheme = /secure|account|verify|verification|bank|kyc|login|update|yono|card|otp/i.test(domainName) || /kyc|verify|update|login/i.test(parsedUrl.pathname);

    return createIngestionResult({
      inputType: 'url',
      claimText: `Unresolvable external domain "${domainName}" circulating in link forwards${isSuspiciousScheme ? ' claiming to provide account verification/banking services' : ''}. Domain has no valid DNS records or is non-existent.`,
      language: 'en',
      entities: [domainName],
      dateHint: null,
      extraction: {
        extractedText: `Target URL: ${parsedUrl.href}\nDNS Resolution Status: Failed (${hostCheck.dnsError})\nDomain Name: ${domainName}\nThreat Pattern: Non-existent or deactivated host commonly indicative of ephemeral smishing/phishing links.`,
        warnings: [
          `Destination host "${domainName}" could not be resolved via public DNS (${hostCheck.dnsError}).`,
          `This domain is either non-existent, unregistered, or has been decommissioned by hosting providers.`
        ],
        readability: 'unresolvable',
        sourceUrl: parsedUrl.href
      }
    });
  }

  const warnings = [];
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response = null;
  try {
    response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TruthLens-Verification-Bot/1.0 (+https://github.com/AlgoMinds1/HT-24; claim-verification)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });
  } catch (fetchErr) {
    clearTimeout(timeoutTimer);
    if (fetchErr.name === 'AbortError') {
      return createIngestionResult({
        inputType: 'url',
        claimText: `Inaccessible or unresponsive web link "${parsedUrl.hostname}". Webpage timed out after ${FETCH_TIMEOUT_MS / 1000} seconds.`,
        language: 'en',
        entities: [parsedUrl.hostname],
        dateHint: null,
        extraction: {
          extractedText: `Target URL: ${parsedUrl.href}\nStatus: Connection timed out after ${FETCH_TIMEOUT_MS / 1000}s.`,
          warnings: [`Webpage request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds.`],
          readability: 'unreachable',
          sourceUrl: parsedUrl.href
        }
      });
    }

    return createIngestionResult({
      inputType: 'url',
      claimText: `Inaccessible web destination "${parsedUrl.hostname}" (${fetchErr.message}).`,
      language: 'en',
      entities: [parsedUrl.hostname],
      dateHint: null,
      extraction: {
        extractedText: `Target URL: ${parsedUrl.href}\nStatus: Inaccessible (${fetchErr.message})`,
        warnings: [`Failed to connect to web host: ${fetchErr.message}`],
        readability: 'inaccessible',
        sourceUrl: parsedUrl.href
      }
    });
  } finally {
    clearTimeout(timeoutTimer);
  }

  // Revalidate final URL in case of redirect to private address
  const finalUrl = new URL(response.url);
  if (finalUrl.hostname !== parsedUrl.hostname) {
    await validateHostForSsrf(finalUrl.hostname);
    warnings.push(`URL redirected to: ${finalUrl.hostname}`);
  }

  if (!response.ok) {
    return createIngestionResult({
      inputType: 'url',
      claimText: `Web destination "${parsedUrl.hostname}" returned HTTP ${response.status} (${response.statusText}). Link is inactive or taken down.`,
      language: 'en',
      entities: [parsedUrl.hostname],
      dateHint: null,
      extraction: {
        extractedText: `Target URL: ${parsedUrl.href}\nHTTP Status: ${response.status} (${response.statusText})`,
        warnings: [`Target web server returned HTTP error status ${response.status} (${response.statusText}). Page appears removed or inactive.`],
        readability: 'inactive',
        sourceUrl: parsedUrl.href
      }
    });
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
    throw ApiError.unsupportedMediaType(`Unsupported webpage content type "${contentType}". Expected HTML page.`, 'UNSUPPORTED_URL_CONTENT_TYPE');
  }

  const html = await response.text();
  if (html.length > MAX_PAGE_SIZE) {
    warnings.push('Webpage HTML exceeded 2MB limit; text truncated for analysis.');
  }

  // Parse HTML DOM via Cheerio
  const $ = cheerio.load(html.substring(0, MAX_PAGE_SIZE));

  // Strip scripts, styles, navigation, footer
  $('script, style, noscript, nav, footer, header, svg, iframe').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

  // Extract clean body text
  let bodyText = $('article, main, .content, .post, #content').text().trim();
  if (!bodyText) {
    bodyText = $('body').text().trim();
  }

  // Normalize whitespace
  bodyText = bodyText.replace(/\s+/g, ' ').trim();

  if (bodyText.length < 20) {
    warnings.push('Very little readable body text was extracted from this page (possible paywall, dynamic JS rendering, or empty page).');
  }

  const claimText = title 
    ? `${title}. ${metaDescription || bodyText.substring(0, 300)}` 
    : (bodyText.substring(0, 350) || `Web article from ${parsedUrl.hostname}`);

  return createIngestionResult({
    inputType: 'url',
    claimText: claimText.substring(0, 500).trim(),
    language: 'en',
    entities: [parsedUrl.hostname],
    dateHint: null,
    extraction: {
      extractedText: bodyText.substring(0, 3000),
      warnings,
      readability: bodyText.length >= 50 ? 'clear' : 'partial',
      sourceUrl: parsedUrl.href
    }
  });
}
