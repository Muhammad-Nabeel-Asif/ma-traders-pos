import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import { HttpError } from './lib/http.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { townsRouter } from './routes/towns.js';
import { salesmenRouter } from './routes/salesmen.js';
import { accountsRouter } from './routes/accounts.js';
import { productsRouter } from './routes/products.js';
import { salesRouter } from './routes/sales.js';
import { cashRouter } from './routes/cash.js';
import { reportsRouter } from './routes/reports.js';

export interface AppOptions {
  /** Absolute path to the built frontend (frontend/dist) for production serving. */
  staticDir?: string;
}

export function createApp(opts: AppOptions = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);

  // protected API
  app.use('/api/towns', requireAuth, townsRouter);
  app.use('/api/salesmen', requireAuth, salesmenRouter);
  app.use('/api/accounts', requireAuth, accountsRouter);
  app.use('/api/products', requireAuth, productsRouter);
  app.use('/api/sales', requireAuth, salesRouter);
  app.use('/api/cash-vouchers', requireAuth, cashRouter);
  app.use('/api/reports', requireAuth, reportsRouter);

  // Serve the built frontend in production (Electron / single-server mode)
  if (opts.staticDir && fs.existsSync(opts.staticDir)) {
    app.use(express.static(opts.staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile('index.html', { root: opts.staticDir });
    });
  }

  // error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    // eslint-disable-next-line no-console
    console.error('[api error]', err);
    res.status(500).json({ error: message });
  });

  return app;
}
