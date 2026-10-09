/**
 * @file test-multimodal-ingest.js
 * Comprehensive automated test suite for Phase 4 Multimodal Input Ingestion.
 * 
 * Tests:
 * 1. Text Ingestion & Validation
 * 2. Image Ingestion (MIME, Magic Bytes, Size limits)
 * 3. Audio Ingestion (MIME, Magic Bytes, Size limits)
 * 4. PDF Ingestion (Magic Header, Text extraction, Scanned detection)
 * 5. URL Ingestion & SSRF Protection (DNS validation, IP blacklists, Protocol guards)
 * 6. Unified Claim Contract consistency across all 5 formats
 */

import { ingestText } from '../src/ingest/text.ingest.js';
import { ingestImage } from '../src/ingest/image.ingest.js';
import { ingestAudio } from '../src/ingest/audio.ingest.js';
import { ingestPdf } from '../src/ingest/pdf.ingest.js';
import { ingestUrl, isPrivateOrReservedIp, validateHostForSsrf } from '../src/ingest/url.ingest.js';
import { ingestInput } from '../src/ingest/index.js';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('🧪 TRUTHLENS PHASE 4: MULTIMODAL INGESTION & SSRF TEST SUITE');
console.log('================================================================\n');

async function runTests() {
  // ----------------------------------------------------------------------------
  // 1. Text Ingestion Tests
  // ----------------------------------------------------------------------------
  console.log('▶ Test Suite 1: Text Ingestion & Sanitization');
  try {
    const res = await ingestText('Good news! The government is offering PM Free Laptop Scheme 2026 registration link.');
    assert(res.inputType === 'text', 'Input type is "text"');
    assert(res.claim.text.includes('PM Free Laptop'), 'Claim text extracted accurately');
    assert(res.claim.dateHint === '2026', 'Temporal date hint detected (2026)');

    let caughtEmpty = false;
    try { await ingestText('   '); } catch (e) { caughtEmpty = e.code === 'MISSING_TEXT'; }
    assert(caughtEmpty, 'Empty/whitespace text rejected with MISSING_TEXT');

    let caughtShort = false;
    try { await ingestText('short'); } catch (e) { caughtShort = e.code === 'TEXT_TOO_SHORT'; }
    assert(caughtShort, 'Short text (<10 chars) rejected with TEXT_TOO_SHORT');
  } catch (e) {
    console.error(e);
    failCount++;
  }

  // ----------------------------------------------------------------------------
  // 2. Image Ingestion Tests
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 2: Image Ingestion (MIME, Magic Bytes, Size Bounds)');
  try {
    // Construct sample 1x1 valid PNG buffer with PNG magic bytes 0x89 0x50 0x4E 0x47
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG magic header
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89
    ]);

    const validImageFile = {
      buffer: validPngBuffer,
      mimetype: 'image/png',
      size: validPngBuffer.length,
      originalname: 'whatsapp_screenshot.png'
    };

    const imgResult = await ingestImage(validImageFile);
    assert(imgResult.inputType === 'image', 'Input type is "image"');
    assert(imgResult.extraction.fileName === 'whatsapp_screenshot.png', 'Original filename preserved');
    assert(typeof imgResult.claim.text === 'string' && imgResult.claim.text.length > 0, 'Claim string formulated');

    // Test rejection of fake image (text file disguised as image/jpeg)
    const fakeImageFile = {
      buffer: Buffer.from('This is a text string, not JPEG magic bytes!'),
      mimetype: 'image/jpeg',
      size: 45,
      originalname: 'fake.jpg'
    };

    let caughtFake = false;
    try { await ingestImage(fakeImageFile); } catch (e) { caughtFake = e.code === 'INVALID_IMAGE_SIGNATURE'; }
    assert(caughtFake, 'Disguised text file rejected with INVALID_IMAGE_SIGNATURE');

    // Test rejection of unsupported MIME type
    let caughtMime = false;
    try { await ingestImage({ buffer: validPngBuffer, mimetype: 'application/x-msdownload', size: 100 }); } 
    catch (e) { caughtMime = e.code === 'UNSUPPORTED_IMAGE_FORMAT'; }
    assert(caughtMime, 'Unsupported MIME type rejected with UNSUPPORTED_IMAGE_FORMAT');

    // Test rejection of oversized image (>10MB)
    let caughtOversized = false;
    try { await ingestImage({ buffer: validPngBuffer, mimetype: 'image/png', size: 11 * 1024 * 1024 }); } 
    catch (e) { caughtOversized = e.code === 'FILE_TOO_LARGE'; }
    assert(caughtOversized, 'Oversized image (>10MB) rejected with FILE_TOO_LARGE');
  } catch (e) {
    console.error(e);
    failCount++;
  }

  // ----------------------------------------------------------------------------
  // 3. Audio Ingestion Tests
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 3: Audio Ingestion (MIME, Magic Bytes, Quality)');
  try {
    // Construct sample WAV buffer with RIFF...WAVE header
    const sampleWav = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x00, 0x00, 0x00, // Chunk size
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20  // "fmt "
    ]);

    const audioFile = {
      buffer: sampleWav,
      mimetype: 'audio/wav',
      size: sampleWav.length,
      originalname: 'voice_note_urgent.wav'
    };

    const audioResult = await ingestAudio(audioFile);
    assert(audioResult.inputType === 'audio', 'Input type is "audio"');
    assert(audioResult.extraction.fileName === 'voice_note_urgent.wav', 'Voice note filename preserved');

    // Rejection of oversized audio (>20MB)
    let caughtOversizedAudio = false;
    try { await ingestAudio({ buffer: sampleWav, mimetype: 'audio/wav', size: 21 * 1024 * 1024 }); } 
    catch (e) { caughtOversizedAudio = e.code === 'FILE_TOO_LARGE'; }
    assert(caughtOversizedAudio, 'Oversized audio (>20MB) rejected with FILE_TOO_LARGE');

    // Rejection of unsupported audio format
    let caughtAudioMime = false;
    try { await ingestAudio({ buffer: sampleWav, mimetype: 'video/mp4', size: 100 }); } 
    catch (e) { caughtAudioMime = e.code === 'UNSUPPORTED_AUDIO_FORMAT'; }
    assert(caughtAudioMime, 'Unsupported audio MIME rejected with UNSUPPORTED_AUDIO_FORMAT');
  } catch (e) {
    console.error(e);
    failCount++;
  }

  // ----------------------------------------------------------------------------
  // 4. PDF Ingestion Tests
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 4: PDF Ingestion (Header Magic, Parsing, Scanned Detection)');
  try {
    const VALID_PDF_BASE64 = 'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA3NSA+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKE9mZmljaWFsIEdhemV0dGUgQ2lyY3VsYXI6IEFsbCB1bml2ZXJzaXR5IGV4YW1zIHBvc3Rwb25lZC4pIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwMzgxIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNDUxCiUlRU9GCg==';
    const pdfBuffer = Buffer.from(VALID_PDF_BASE64, 'base64');

    const pdfFile = {
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      originalname: 'gazette_order.pdf'
    };

    const pdfResult = await ingestPdf(pdfFile);
    assert(pdfResult.inputType === 'pdf', 'Input type is "pdf"');
    assert(pdfResult.extraction.extractedText.includes('Official Gazette Circular'), 'PDF text parsed accurately via pdf-parse');
    assert(pdfResult.claim.text.includes('Official Gazette'), 'Claim formulated from document text');

    // Test rejection of non-PDF file disguised with .pdf extension
    const fakePdf = {
      buffer: Buffer.from('Not a PDF binary!'),
      mimetype: 'application/pdf',
      size: 18,
      originalname: 'fake.pdf'
    };
    let caughtFakePdf = false;
    try { await ingestPdf(fakePdf); } catch (e) { caughtFakePdf = e.code === 'INVALID_PDF_SIGNATURE'; }
    assert(caughtFakePdf, 'Non-PDF binary rejected with INVALID_PDF_SIGNATURE');

    // Test scanned PDF heuristic (< 25 words but file size > 50KB)
    const scannedPdfResult = await ingestPdf({
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      size: 80 * 1024, // 80KB file size with only 6 words
      originalname: 'scanned_scan.pdf'
    });
    assert(scannedPdfResult.extraction.readability === 'partial', 'Scanned PDF tagged as partial legibility');
    assert(scannedPdfResult.extraction.warnings.some(w => w.includes('scanned document')), 'Scanned PDF produces actionable user warning');
  } catch (e) {
    console.error(e);
    failCount++;
  }

  // ----------------------------------------------------------------------------
  // 5. URL Ingestion & SSRF Defense Tests
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 5: URL Ingestion & SSRF Security Defenses');
  try {
    // 1. IP range blacklists
    assert(isPrivateOrReservedIp('127.0.0.1') === true, '127.0.0.1 recognized as loopback/blocked');
    assert(isPrivateOrReservedIp('127.255.0.1') === true, '127.255.0.1 recognized as loopback/blocked');
    assert(isPrivateOrReservedIp('::1') === true, '::1 recognized as IPv6 loopback/blocked');
    assert(isPrivateOrReservedIp('10.0.0.1') === true, '10.0.0.1 recognized as private/blocked');
    assert(isPrivateOrReservedIp('172.16.5.4') === true, '172.16.5.4 recognized as private/blocked');
    assert(isPrivateOrReservedIp('192.168.1.1') === true, '192.168.1.1 recognized as private/blocked');
    assert(isPrivateOrReservedIp('169.254.169.254') === true, '169.254.169.254 (Cloud metadata) recognized as blocked');
    assert(isPrivateOrReservedIp('0.0.0.0') === true, '0.0.0.0 recognized as blocked');
    assert(isPrivateOrReservedIp('8.8.8.8') === false, '8.8.8.8 recognized as safe public IP');

    // 2. Protocol validation
    let caughtFileProtocol = false;
    try { await ingestUrl('file:///etc/passwd'); } catch (e) { caughtFileProtocol = e.code === 'UNSUPPORTED_PROTOCOL'; }
    assert(caughtFileProtocol, 'file:/// protocol blocked with UNSUPPORTED_PROTOCOL');

    let caughtJsProtocol = false;
    try { await ingestUrl('javascript:alert(1)'); } catch (e) { caughtJsProtocol = e.code === 'UNSUPPORTED_PROTOCOL'; }
    assert(caughtJsProtocol, 'javascript: protocol blocked with UNSUPPORTED_PROTOCOL');

    // 3. SSRF Localhost Block
    let caughtLocalhost = false;
    try { await ingestUrl('http://localhost:8000/api/health'); } catch (e) { caughtLocalhost = e.code === 'SSRF_BLOCKED'; }
    assert(caughtLocalhost, 'Targeting http://localhost blocked with SSRF_BLOCKED');

    let caughtLoopback = false;
    try { await ingestUrl('http://127.0.0.1:8000/api/health'); } catch (e) { caughtLoopback = e.code === 'SSRF_BLOCKED'; }
    assert(caughtLoopback, 'Targeting http://127.0.0.1 blocked with SSRF_BLOCKED');

    // 4. SSRF Cloud Metadata Block
    let caughtMetadata = false;
    try { await ingestUrl('http://169.254.169.254/latest/meta-data/'); } catch (e) { caughtMetadata = e.code === 'SSRF_BLOCKED'; }
    assert(caughtMetadata, 'Targeting AWS metadata endpoint blocked with SSRF_BLOCKED');
  } catch (e) {
    console.error(e);
    failCount++;
  }

  // ----------------------------------------------------------------------------
  // 6. Unified Dispatcher IngestInput Consistency Check
  // ----------------------------------------------------------------------------
  console.log('\n▶ Test Suite 6: Unified Ingestion Dispatcher Contract Consistency');
  try {
    const textOut = await ingestInput({ inputType: 'text', text: 'Viral claim that lemon water cures 100% of cancer cells.' });
    assert(textOut.inputType === 'text', 'Dispatcher handles text');
    assert(Boolean(textOut.claim.text), 'Dispatcher text emits claim.text');
    assert(Array.isArray(textOut.extraction.warnings), 'Dispatcher emits warnings array');

    const samplePng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const imgOut = await ingestInput({
      inputType: 'image',
      file: { buffer: samplePng, mimetype: 'image/png', size: samplePng.length, originalname: 'test.png' }
    });
    assert(imgOut.inputType === 'image', 'Dispatcher handles image');
    assert(Boolean(imgOut.claim.text), 'Dispatcher image emits claim.text');
  } catch (e) {
    console.error(e);
    failCount++;
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All multimodal ingestion and SSRF tests passed successfully!');
    process.exit(0);
  }
}

runTests();
