import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

/**
 * Resolves runtime configuration. The database path can be injected by the
 * Electron main process (via MA_DB_PATH) so data lives in the OS user-data
 * folder when packaged, and in ./data during local development.
 */

function resolveDataDir(): string {
  if (process.env.MA_DATA_DIR) return process.env.MA_DATA_DIR;
  // default: <repo>/data during development
  return path.resolve(process.cwd(), 'data');
}

const dataDir = resolveDataDir();
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const config = {
  port: Number(process.env.PORT ?? 4317),
  dataDir,
  dbPath: process.env.MA_DB_PATH ?? path.join(dataDir, 'ma_traders.db'),
  jwtSecret:
    process.env.MA_JWT_SECRET ?? 'ma-traders-dev-secret-change-in-production',
  jwtExpiresIn: '12h',
  isProd: process.env.NODE_ENV === 'production',
  hostname: os.hostname(),
};
