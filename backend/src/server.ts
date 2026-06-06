import type { Server } from 'node:http';
import { createApp, type AppOptions } from './app.js';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { ensureSeed } from './db/seed.js';

export interface StartOptions extends AppOptions {
  port?: number;
  migrationsFolder?: string;
}

/**
 * Boots the API: runs migrations, ensures a default admin user exists,
 * and starts listening. Used by both the standalone dev server and Electron.
 */
export async function startServer(opts: StartOptions = {}): Promise<Server> {
  runMigrations(opts.migrationsFolder);
  await ensureSeed();

  const app = createApp({ staticDir: opts.staticDir });
  const port = opts.port ?? config.port;

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[MA Traders] API listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}
