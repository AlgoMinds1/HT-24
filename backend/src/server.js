import { app } from './app.js';
import { env } from './config/env.js';
import './retrieval/retriever.service.js';

const PORT = env.PORT;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`🚀 TruthLens Backend Service active on port ${PORT} (0.0.0.0)`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Allowed Origin: ${env.FRONTEND_ORIGIN}`);
  console.log(`   Primary Engine: ${env.hasGroqKey ? 'Groq (' + env.GROQ_MODEL + ')' : (env.hasGeminiKey ? 'Gemini (' + env.GEMINI_MODEL + ')' : 'Grounded Fallback Engine')}`);
  console.log(`   Groq Key Configured: ${env.hasGroqKey ? 'YES' : 'NO'}`);
  console.log(`   Gemini Key Configured: ${env.hasGeminiKey ? 'YES' : 'NO'}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log('================================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process. Please free port ${PORT} or change PORT in .env.`);
  } else {
    console.error('❌ Server error:', err);
  }
});

// Process-level exception protection
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception in TruthLens backend:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful Shutdown
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down TruthLens server...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
