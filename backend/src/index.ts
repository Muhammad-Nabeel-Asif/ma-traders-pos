import { startServer } from './server.js';

startServer().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start MA Traders API:', err);
  process.exit(1);
});
