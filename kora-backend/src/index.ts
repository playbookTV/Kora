import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  try {
    const app = await buildApp();

    await app.listen({
      port: parseInt(env.PORT, 10),
      host: '0.0.0.0', // Required for Railway
    });

    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   🎤 Kora Backend API                                 ║
    ║                                                       ║
    ║   Server running on port ${env.PORT.padEnd(26)}║
    ║   Environment: ${env.NODE_ENV.padEnd(35)}║
    ║                                                       ║
    ║   Endpoints:                                          ║
    ║   - Health:       GET  /health                        ║
    ║   - Auth:         POST /auth/signup                   ║
    ║   - Auth:         POST /auth/login                    ║
    ║   - Users:        GET  /users/profile                 ║
    ║   - Transactions: GET  /transactions                  ║
    ║   - AI Chat:      POST /ai/chat                       ║
    ║   - AI Voice:     POST /ai/voice                      ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

start();
