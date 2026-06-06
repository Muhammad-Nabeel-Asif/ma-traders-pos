import { Router } from 'express';
import { eq, like, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { salesmen } from '../db/schema.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { getSalesmanOutstanding } from '../lib/posting.js';

export const salesmenRouter = Router();

const salesmanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().default(''),
  creditLimit: z.number().int().nonnegative().optional().default(0),
  active: z.boolean().optional().default(true),
});

salesmenRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const rows = db
      .select()
      .from(salesmen)
      .where(q ? like(salesmen.name, `%${q}%`) : undefined)
      .orderBy(desc(salesmen.id))
      .all();
    // attach current outstanding exposure for the credit-limit display
    const withExposure = rows.map((s) => ({
      ...s,
      outstanding: getSalesmanOutstanding(s.id),
    }));
    res.json(withExposure);
  }),
);

salesmenRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const row = db.select().from(salesmen).where(eq(salesmen.id, id)).get();
    if (!row) throw notFound('Salesman not found');
    res.json({ ...row, outstanding: getSalesmanOutstanding(id) });
  }),
);

salesmenRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = salesmanSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');
    const row = db.insert(salesmen).values(parsed.data).returning().get();
    res.status(201).json(row);
  }),
);

salesmenRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = salesmanSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid data');
    const row = db
      .update(salesmen)
      .set(parsed.data)
      .where(eq(salesmen.id, id))
      .returning()
      .get();
    if (!row) throw notFound('Salesman not found');
    res.json(row);
  }),
);

salesmenRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    db.delete(salesmen).where(eq(salesmen.id, id)).run();
    res.json({ ok: true });
  }),
);
