/**
 * @file cors.test.js
 * Comprehensive CORS Verification Test Suite for TruthLens
 * 
 * Verifies:
 * 1. Exact origin allowance for production frontend: https://ht-24.vercel.app
 * 2. Origin normalization (trailing slash, subdomains, localhost)
 * 3. OPTIONS preflight handling for /api/verify and /verify
 * 4. Actual POST and GET requests from permitted frontend
 * 5. Correct CORS headers on error responses (e.g. 404)
 * 6. Disallowance of unauthorized origins
 */

import { isOriginAllowed, getAllowedOrigins } from '../src/config/cors.js';

let passCount = 0;
let failCount = 0;
const logs = [];

function assert(condition, message) {
  if (condition) {
    logs.push(`✓ PASS: ${message}`);
    passCount++;
  } else {
    logs.push(`✗ FAIL: ${message}`);
    failCount++;
  }
}

export async function runCorsTests(baseUrl = 'http://localhost:8000') {
  passCount = 0;
  failCount = 0;
  logs.length = 0;

  logs.push('================================================================');
  logs.push('🧪 TRUTHLENS CORS & PREFLIGHT VERIFICATION TEST SUITE');
  logs.push('================================================================');

  // ---------------------------------------------------------------------------
  // 1. Origin Matching Unit Tests
  // ---------------------------------------------------------------------------
  logs.push('\n▶ Section 1: Origin Policy Matching Logic');
  try {
    assert(isOriginAllowed('https://ht-24.vercel.app') === true, 'Production frontend https://ht-24.vercel.app is allowed');
    assert(isOriginAllowed('https://ht-24.vercel.app/') === true, 'Production frontend with trailing slash is allowed');
    assert(isOriginAllowed('https://ht-24-preview.vercel.app') === true, 'Vercel preview deployment is allowed');
    assert(isOriginAllowed('http://localhost:5173') === true, 'Localhost 5173 is allowed');
    assert(isOriginAllowed('http://localhost:5174') === true, 'Localhost 5174 is allowed');
    assert(isOriginAllowed('http://localhost:3000') === true, 'Localhost 3000 is allowed');
    assert(isOriginAllowed('http://127.0.0.1:5173') === true, '127.0.0.1 is allowed');
    assert(isOriginAllowed(null) === true, 'Server-to-server / curl (null origin) is allowed');
    assert(isOriginAllowed('') === true, 'Empty origin is allowed');
    assert(isOriginAllowed('https://evil-hacker.com') === false, 'Unauthorized origin is rejected');
    assert(isOriginAllowed('https://phishing-site.org') === false, 'Malicious origin is rejected');
  } catch (err) {
    logs.push(`✗ ERROR in Section 1: ${err.message}`);
    failCount++;
  }

  // ---------------------------------------------------------------------------
  // 2. HTTP Server Preflight & Header Integration Tests
  // ---------------------------------------------------------------------------
  logs.push(`\n▶ Section 2: Live HTTP Preflight & Header Verification (${baseUrl})`);
  try {
    const prodOrigin = 'https://ht-24.vercel.app';

    // Test 2A: OPTIONS Preflight for /api/verify
    const preflightRes = await fetch(`${baseUrl}/api/verify`, {
      method: 'OPTIONS',
      headers: {
        'Origin': prodOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, x-skip-cache'
      }
    });

    assert(preflightRes.status === 204 || preflightRes.status === 200, `OPTIONS /api/verify returns 200/204 (actual: ${preflightRes.status})`);
    assert(preflightRes.headers.get('access-control-allow-origin') === prodOrigin, 'OPTIONS /api/verify returns Access-Control-Allow-Origin: https://ht-24.vercel.app');
    assert(preflightRes.headers.get('access-control-allow-credentials') === 'true', 'OPTIONS /api/verify returns Access-Control-Allow-Credentials: true');
    
    const allowedMethods = (preflightRes.headers.get('access-control-allow-methods') || '').toUpperCase();
    assert(allowedMethods.includes('POST'), 'OPTIONS /api/verify allows POST method');
    assert(allowedMethods.includes('OPTIONS'), 'OPTIONS /api/verify allows OPTIONS method');

    // Test 2B: OPTIONS Preflight for root /verify
    const rootPreflightRes = await fetch(`${baseUrl}/verify`, {
      method: 'OPTIONS',
      headers: {
        'Origin': prodOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    assert(rootPreflightRes.status === 204 || rootPreflightRes.status === 200, `OPTIONS /verify returns 200/204 (actual: ${rootPreflightRes.status})`);
    assert(rootPreflightRes.headers.get('access-control-allow-origin') === prodOrigin, 'OPTIONS /verify returns Access-Control-Allow-Origin: https://ht-24.vercel.app');

    // Test 2C: Actual GET /api/health with production Origin
    const healthRes = await fetch(`${baseUrl}/api/health`, {
      headers: { 'Origin': prodOrigin }
    });
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.headers.get('access-control-allow-origin') === prodOrigin, 'GET /api/health returns Access-Control-Allow-Origin: https://ht-24.vercel.app');

    // Test 2D: Unauthorized Origin receives no allow-origin header
    const unauthorizedRes = await fetch(`${baseUrl}/api/health`, {
      headers: { 'Origin': 'https://unauthorized-domain.com' }
    });
    assert(unauthorizedRes.headers.get('access-control-allow-origin') !== 'https://unauthorized-domain.com', 'Unauthorized origin does not receive Access-Control-Allow-Origin');

    // Test 2E: Error Route (404) preserves CORS headers for permitted frontend
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent-route-for-testing`, {
      headers: { 'Origin': prodOrigin }
    });
    assert(notFoundRes.status === 404, 'Nonexistent route returns 404');
    assert(notFoundRes.headers.get('access-control-allow-origin') === prodOrigin, '404 error response preserves Access-Control-Allow-Origin for production frontend');

  } catch (err) {
    logs.push(`✗ ERROR in Section 2: ${err.message}`);
    failCount++;
  }

  logs.push('\n================================================================');
  logs.push(`Results: ${passCount} Passed, ${failCount} Failed`);
  logs.push('================================================================');

  if (failCount === 0) {
    logs.push('🎉 ALL CORS & PREFLIGHT VERIFICATION TESTS PASSED!');
  }

  return { passCount, failCount, logs, success: failCount === 0 };
}

// If executed directly from CLI
if (process.argv[1] && process.argv[1].includes('cors.test.js')) {
  const result = await runCorsTests();
  result.logs.forEach(l => console.log(l));
  process.exit(result.failCount > 0 ? 1 : 0);
}
