import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chunkDocument } from '../src/retrieval/chunker.js';
import { vectorStore } from '../src/retrieval/vector_store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate kb documents directory
const KB_DOCS_DIR = path.resolve(__dirname, '../../kb/documents');

async function runIngestion() {
  console.log('================================================================');
  console.log('🚀 TruthLens KB Ingestion & Vector Indexer');
  console.log(`📁 Source Directory: ${KB_DOCS_DIR}`);
  console.log('================================================================\n');

  if (!fs.existsSync(KB_DOCS_DIR)) {
    console.error(`❌ KB documents directory not found at: ${KB_DOCS_DIR}`);
    process.exit(1);
  }

  const docFiles = fs.readdirSync(KB_DOCS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${docFiles.length} curated documents to ingest:`);

  const allChunks = [];

  for (const filename of docFiles) {
    const fullPath = path.join(KB_DOCS_DIR, filename);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const doc = JSON.parse(content);

    console.log(`- Ingesting "${doc.title}" (${doc.source_name}, ${doc.trust_tier})`);
    
    // Chunk document into passages
    const chunks = chunkDocument(doc, { maxWordsPerChunk: 70, overlapSentences: 1 });
    console.log(`  └ Generated ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }

  console.log(`\nIndexing ${allChunks.length} total chunks with embeddings into local store...`);
  const indexedCount = await vectorStore.addChunks(allChunks);

  console.log(`\n✅ Ingestion complete! Successfully indexed ${indexedCount} chunks into vector store.`);
  console.log('Index persisted to backend/data/vector_store.json\n');
}

runIngestion().catch(err => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});
