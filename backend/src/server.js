import { app } from './app.js';
import { env } from './config/env.js';
import './retrieval/retriever.service.js';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 TruthLens Backend Service active on port ${PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Allowed Origin: ${env.FRONTEND_ORIGIN}`);
  console.log(`   Gemini Model: ${env.GEMINI_MODEL}`);
  console.log(`   Gemini Key Configured: ${env.hasGeminiKey ? 'YES' : 'NO (Required for live queries)'}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log('================================================================');
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
