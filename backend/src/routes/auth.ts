import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { signToken, verifyPassword } from '../lib/auth.js';
import { asyncHandler, badRequest, unauthorized } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest('Username and password required');

    const { username, password } = parsed.data;
    const user = db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .get();

    if (!user || !user.active) throw unauthorized('Invalid credentials');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid credentials');

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        permissions: JSON.parse(user.permissions || '{}'),
      },
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .get();
    if (!user) throw unauthorized();
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      permissions: JSON.parse(user.permissions || '{}'),
    });
  }),
);
