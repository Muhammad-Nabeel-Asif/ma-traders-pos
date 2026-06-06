import { Router } from 'express';
import { eq, like, or, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';

export const productsRouter = Router();

const productSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  cartonSize: z.number().int().positive().optional().default(1),
  purchasePrice: z.number().int().nonnegative().optional().default(0),
  salePrice: z.number().int().nonnegative().optional().default(0),
  stockUnits: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const rows = db
      .select()
      .from(products)
      .where(
        q ? or(like(products.name, `%${q}%`), like(products.code, `%${q}%`)) : undefined,
      )
      .orderBy(desc(products.id))
      .all();
    res.json(rows);
  }),
);

productsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');
    const existing = db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.code, parsed.data.code))
      .get();
    if (existing) throw badRequest('A product with this code already exists');
    const row = db.insert(products).values(parsed.data).returning().get();
    res.status(201).json(row);
  }),
);

productsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid data');
    const row = db
      .update(products)
      .set(parsed.data)
      .where(eq(products.id, id))
      .returning()
      .get();
    if (!row) throw notFound('Product not found');
    res.json(row);
  }),
);

productsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    db.delete(products).where(eq(products.id, id)).run();
    res.json({ ok: true });
  }),
);
