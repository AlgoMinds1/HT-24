import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'vector_store.json');

// Common English stopwords for lexical token filtering
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'did', 'do', 'does', 'doing', 'don', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same', 'she', 'should',
  'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
  'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'will', 'with', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenizes text into normalized keywords.
 */
export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates BM25-like lexical overlap score between query tokens and chunk tokens.
 */
export function lexicalScore(queryTokens, chunkTokens, chunkTags = []) {
  if (!queryTokens.length || !chunkTokens.length) return 0;

  const chunkFreq = {};
  for (const t of chunkTokens) {
    chunkFreq[t] = (chunkFreq[t] || 0) + 1;
  }
  for (const tag of chunkTags) {
    const t = tag.toLowerCase();
    chunkFreq[t] = (chunkFreq[t] || 0) + 2; // Extra weight for tags
  }

  let matchScore = 0;
  let matchedQueryTokens = 0;

  for (const q of queryTokens) {
    if (chunkFreq[q]) {
      matchedQueryTokens++;
      matchScore += 1 + Math.log(1 + chunkFreq[q]);
    }
  }

  // Guard against false positives: single incidental word matching an unrelated document
  const queryOverlapRatio = matchedQueryTokens / queryTokens.length;
  if (queryTokens.length >= 3 && (matchedQueryTokens < 2 || queryOverlapRatio < 0.20)) {
    return 0;
  }
  if (matchedQueryTokens === 0) {
    return 0;
  }

  const score = (matchScore / (Math.log(chunkTokens.length + 2) + 1)) * queryOverlapRatio;
  return Math.max(0, Math.min(1.0, score));
}

export class LocalVectorStore {
  constructor() {
    this.chunks = [];
    this.genAI = null;
    this.isLoaded = false;
  }

  getGenAI() {
    if (!this.genAI && env.hasGeminiKey) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Generates vector embedding via Gemini API if available, returns null on failure/quota.
   */
  async generateEmbedding(text) {
    const client = this.getGenAI();
    if (!client) return null;

    if (this._embeddingDisabled) return null;

    const candidateModels = this._activeEmbeddingModel
      ? [this._activeEmbeddingModel]
      : ['gemini-embedding-001', 'embedding-001'];

    for (const modelName of candidateModels) {
      try {
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.embedContent(text);
        if (result?.embedding?.values) {
          this._activeEmbeddingModel = modelName;
          return result.embedding.values;
        }
      } catch (err) {
        // Continue to fallback model
      }
    }

    // If both failed once, disable further remote embedding calls and rely on lexical engine
    this._embeddingDisabled = true;
    return null;
  }

  /**
   * Loads persisted vector store from local disk if it exists.
   */
  load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        this.chunks = data.chunks || [];
        this.isLoaded = true;
        return true;
      }
    } catch (err) {
      console.warn(`[VectorStore] Could not load persisted store: ${err.message}`);
    }
    this.chunks = [];
    this.isLoaded = false;
    return false;
  }

  /**
   * Persists the chunks and vectors to local disk.
   */
  save() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      updated_at: new Date().toISOString(),
      chunk_count: this.chunks.length,
      chunks: this.chunks
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    this.isLoaded = true;
  }

  /**
   * Adds chunks to the vector store with embeddings and token caches.
   */
  async addChunks(rawChunks) {
    const processed = [];

    for (const chunk of rawChunks) {
      const tokens = tokenize(chunk.text);
      const embedding = await this.generateEmbedding(chunk.text);

      processed.push({
        ...chunk,
        tokens,
        embedding: embedding || null
      });
    }

    this.chunks = processed;
    this.save();
    return this.chunks.length;
  }

  /**
   * Automatically bootstraps vector store from curated KB documents if store file does not exist.
   */
  async ensureLoaded() {
    if (this.isLoaded && this.chunks.length > 0) return true;
    if (this.load() && this.chunks.length > 0) return true;

    const candidateDirs = [
      path.resolve(__dirname, '../../../kb/documents'),
      path.resolve(__dirname, '../../../../kb/documents'),
      path.resolve(process.cwd(), 'kb/documents'),
      path.resolve(process.cwd(), '../kb/documents')
    ];

    let kbDocsDir = null;
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        kbDocsDir = dir;
        break;
      }
    }

    if (!kbDocsDir) {
      console.warn('[VectorStore] No kb/documents directory found during bootstrap.');
      return false;
    }

    try {
      const { chunkDocument } = await import('./chunker.js');
      const docFiles = fs.readdirSync(kbDocsDir).filter(f => f.endsWith('.json'));
      const allChunks = [];

      for (const file of docFiles) {
        const raw = fs.readFileSync(path.join(kbDocsDir, file), 'utf-8');
        const doc = JSON.parse(raw);
        const chunks = chunkDocument(doc, { maxWordsPerChunk: 70, overlapSentences: 1 });
        allChunks.push(...chunks);
      }

      console.log(`[VectorStore] Auto-bootstrapping store with ${allChunks.length} chunks from ${kbDocsDir}...`);
      await this.addChunks(allChunks);
      return true;
    } catch (err) {
      console.warn(`[VectorStore] Bootstrap error: ${err.message}`);
      return false;
    }
  }

  /**
   * Performs hybrid search (embedding similarity + lexical relevance).
   * 
   * @param {string} query 
   * @param {Object} options 
   * @param {number} options.topK 
   * @param {number} options.minScore 
   * @returns {Promise<Array<Object>>}
   */
  async search(query, options = {}) {
    await this.ensureLoaded();
    if (this.chunks.length === 0) {
      return [];
    }

    const { topK = 5, minScore = 0.25 } = options;
    const queryTokens = tokenize(query);
    const queryEmbedding = await this.generateEmbedding(query);

    const scored = this.chunks.map(chunk => {
      // 1. Lexical score
      const lexScore = lexicalScore(queryTokens, chunk.tokens, chunk.tags);

      // 2. Embedding cosine score
      let embScore = 0;
      if (queryEmbedding && chunk.embedding) {
        embScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Calibrate cosine similarity for text-embedding-004 (which has ~0.45 uncentered baseline)
      let calibratedEmb = 0;
      if (queryEmbedding && chunk.embedding) {
        calibratedEmb = Math.max(0, (embScore - 0.45) / 0.55);
      }

      let finalScore;
      if (queryEmbedding && chunk.embedding) {
        // If there is zero lexical match, require strong semantic embedding (>= 0.68)
        if (lexScore === 0 && embScore < 0.68) {
          finalScore = 0;
        } else {
          finalScore = (calibratedEmb * 0.55) + (lexScore * 0.45);
        }
      } else {
        finalScore = lexScore;
      }

      return {
        ...chunk,
        score: Math.max(0, Math.min(1.0, finalScore)),
        similarityType: queryEmbedding && chunk.embedding ? 'hybrid' : 'lexical'
      };
    });

    return scored
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export const vectorStore = new LocalVectorStore();
