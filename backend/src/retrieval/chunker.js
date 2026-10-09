/**
 * Chunker utility for TruthLens Knowledge Base
 * Splits documents into coherent semantic passages with overlap while preserving metadata.
 */

/**
 * Splits text into sentences using punctuation boundaries.
 * @param {string} text 
 * @returns {string[]}
 */
export function splitIntoSentences(text) {
  if (!text) return [];
  // Split on period, exclamation, question mark followed by space or newline
  const rawSentences = text
    .replace(/([.?!])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|');
  
  return rawSentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Chunks a curated document into passage chunks.
 * 
 * @param {Object} document 
 * @param {Object} options 
 * @param {number} options.maxWordsPerChunk 
 * @param {number} options.overlapSentences 
 * @returns {Array<Object>}
 */
export function chunkDocument(document, options = {}) {
  const { maxWordsPerChunk = 75, overlapSentences = 1 } = options;
  const sentences = splitIntoSentences(document.content || '');
  if (sentences.length === 0) return [];

  const chunks = [];
  let currentSentences = [];
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = sentence.split(/\s+/).length;

    if (currentWordCount + words > maxWordsPerChunk && currentSentences.length > 0) {
      const chunkText = currentSentences.join(' ');
      chunks.push({
        id: `${document.id}#chunk-${chunkIndex}`,
        docId: document.id,
        chunkIndex,
        text: chunkText,
        source_name: document.source_name,
        url: document.url,
        published_date: document.published_date,
        trust_tier: document.trust_tier,
        domain: document.domain,
        title: document.title,
        tags: document.tags || []
      });
      chunkIndex++;

      // Retain overlap sentences
      const overlap = currentSentences.slice(-overlapSentences);
      currentSentences = [...overlap, sentence];
      currentWordCount = currentSentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0);
    } else {
      currentSentences.push(sentence);
      currentWordCount += words;
    }
  }

  // Push final remaining chunk
  if (currentSentences.length > 0) {
    const chunkText = currentSentences.join(' ');
    chunks.push({
      id: `${document.id}#chunk-${chunkIndex}`,
      docId: document.id,
      chunkIndex,
      text: chunkText,
      source_name: document.source_name,
      url: document.url,
      published_date: document.published_date,
      trust_tier: document.trust_tier,
      domain: document.domain,
      title: document.title,
      tags: document.tags || []
    });
  }

  return chunks;
}
