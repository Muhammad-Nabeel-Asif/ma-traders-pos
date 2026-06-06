import { Router } from 'express';
import { eq, like, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { towns } from '../db/schema.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';

export const townsRouter = Router();

const townSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional().default(''),
});

townsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const rows = db
      .select()
      .from(towns)
      .where(q ? like(towns.name, `%${q}%`) : undefined)
      .orderBy(desc(towns.id))
      .all();
    res.json(rows);
  }),
);

townsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = townSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');
    const row = db.insert(towns).values(parsed.data).returning().get();
    res.status(201).json(row);
  }),
);

townsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = townSchema.partial().safeParse(req.body);
    if (!parsed.success) throw badRequest('Invalid data');
    const row = db
      .update(towns)
      .set(parsed.data)
      .where(eq(towns.id, id))
      .returning()
      .get();
    if (!row) throw notFound('Town not found');
    res.json(row);
  }),
);

townsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    db.delete(towns).where(eq(towns.id, id)).run();
    res.json({ ok: true });
  }),
);
