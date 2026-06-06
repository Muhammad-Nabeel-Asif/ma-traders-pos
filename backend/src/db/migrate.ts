import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index.js';

/**
 * Applies all generated migrations. The Electron main process passes an
 * absolute migrations folder; the CLI (`npm run db:migrate`, run from the
 * repo root) falls back to ./backend/drizzle.
 */
export function runMigrations(migrationsFolder?: string): void {
  const folder =
    migrationsFolder ?? path.resolve(process.cwd(), 'backend/drizzle');
  migrate(db, { migrationsFolder: folder });
}

// Allow running directly: `tsx backend/src/db/migrate.ts`
if (process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1])) {
  runMigrations();
  console.log('Migrations applied.');
}
