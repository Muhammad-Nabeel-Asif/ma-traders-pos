import { Router } from 'express';
import { eq, like, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { accounts, ledgerEntries } from '../db/schema.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { getAccountBalance } from '../lib/posting.js';

export const accountsRouter = Router();

const accountSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  type: z
    .enum(['customer', 'supplier', 'cash', 'expense', 'income', 'other'])
    .optional()
    .default('customer'),
  address: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  townId: z.number().int().nullable().optional(),
  salesmanId: z.number().int().nullable().optional(),
  shopLimit: z.number().int().nonnegative().optional().default(0),
  openingBalance: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

accountsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const type = req.query.type as string | undefined;
    const conditions = [];
    if (q) conditions.push(like(accounts.name, `%${q}%`));
    if (type) conditions.push(eq(accounts.type, type as never));

    const rows = db
      .select()
      .from(accounts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(accounts.id))
      .all();

    const withBalance = rows.map((a) => ({
      ...a,
      balance: getAccountBalance(a.id),
    }));
    res.json(withBalance);
  }),
);

accountsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = db.select().from(accounts).where(eq(accounts.id, id)).get();
    if (!row) throw notFound('Account not found');
    res.json({ ...row, balance: getAccountBalance(id) });
  }),
);

accountsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');

    const existing = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.code, parsed.data.code))
      .get();
    if (existing) throw badRequest('An account with this code already exists');

    const row = db.insert(accounts).values(parsed.data).returning().get();

    // post opening balance to the ledger so balances are consistent
    if (parsed.data.openingBalance && parsed.data.openingBalance !== 0) {
      const ob = parsed.data.openingBalance;
      db.insert(ledgerEntries)
        .values({
          accountId: row.id,
          date: new Date().toISOString().slice(0, 10),
          refType: 'OPENING',
          refId: row.id,
          narration: 'Opening balance',
          debit: ob > 0 ? ob : 0,
          credit: ob < 0 ? -ob : 0,
        })
        .run();
      // store openingBalance on the row as 0 to avoid double counting,
      // since it is now represented by a ledger entry
      db.update(accounts)
        .set({ openingBalance: 0 })
        .where(eq(accounts.id, row.id))
        .run();
    }

    res.status(201).json({ ...row, balance: getAccountBalance(row.id) });
  }),
);

accountsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = accountSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid data');
    // openingBalance is managed via ledger entries; ignore direct edits here
    const { openingBalance: _ignore, ...rest } = parsed.data;
    const row = db
      .update(accounts)
      .set(rest)
      .where(eq(accounts.id, id))
      .returning()
      .get();
    if (!row) throw notFound('Account not found');
    res.json({ ...row, balance: getAccountBalance(id) });
  }),
);

accountsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    db.delete(accounts).where(eq(accounts.id, id)).run();
    res.json({ ok: true });
  }),
);
